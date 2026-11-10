"""Robot Repair API (vision Section 8).

Run from the repository root:
    uvicorn main:app --reload --app-dir web/backend
"""

import json
import re
from collections.abc import Iterator
from contextlib import asynccontextmanager
from datetime import UTC
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import auth
import scoring
from db import AuthToken, Database, MissionProgress, TypingSession, User, now

USERNAME = re.compile(r"^[A-Za-z0-9_]{3,24}$")
MAX_JSON_BYTES = 64_000
HISTORY_LIMIT = 200


# ---------- request models ----------

class Credentials(BaseModel):
    username: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def check_username(cls, value: str) -> str:
        if not USERNAME.match(value):
            raise ValueError("3-24 letters, digits or underscores")
        return value.lower()


def _small_json(value: dict | None) -> dict | None:
    if value is not None and len(json.dumps(value)) > MAX_JSON_BYTES:
        raise ValueError("payload too large")
    return value


class SessionIn(BaseModel):
    mission: str
    level: int = Field(ge=1)
    passage: str
    repaired: bool
    time_left: int = Field(ge=0)
    elapsed_seconds: float = Field(gt=0)
    correct_characters: int = Field(ge=0)
    keystrokes: int = Field(ge=0, description="Character keystrokes, excluding Backspace")
    errors: int = Field(ge=0, description="Wrong keystrokes, even if fixed later")
    backspaces: int = Field(ge=0)
    consistency: int = Field(ge=0, le=100)
    burst_wpm: int = Field(ge=0, le=1000)
    # Aggregated per-session features (per-key and per-pair counts, fatigue signals).
    features: dict = Field(default_factory=dict)
    # Typing profile as updated by the client-side analyzer (moves server-side in Phase 4).
    profile: dict | None = None

    @field_validator("features", "profile")
    @classmethod
    def limit_size(cls, value: dict | None) -> dict | None:
        return _small_json(value)


class PassageCheck(BaseModel):
    text: str


class ScoreRequest(BaseModel):
    correct_characters: int = Field(ge=0)
    keystrokes: int = Field(ge=0)
    errors: int = Field(ge=0)
    elapsed_seconds: float = Field(gt=0)
    repaired: bool
    level: int = Field(ge=1, le=3)
    time_left: int = Field(ge=0)
    target_wpm: int = Field(gt=0)


# ---------- app ----------

def create_app(database_url: str | None = None) -> FastAPI:
    database = Database(database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        database.create_all()
        yield

    app = FastAPI(title="Robot Repair API", version="0.3.0", lifespan=lifespan)
    app.state.db = database
    _routes(app)
    return app


def get_db(request: Request) -> Iterator[Session]:
    yield from request.app.state.db.session()


DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB, authorization: Annotated[str | None, Header()] = None) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    token = db.get(AuthToken, auth.hash_token(authorization.removeprefix("Bearer ")))
    expires = token.expires_at.replace(tzinfo=token.expires_at.tzinfo or UTC) if token else None
    if not token or expires < now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please sign in again")
    return db.get(User, token.user_id)


CurrentUser = Annotated[User, Depends(current_user)]


def _issue_token(db: Session, user: User) -> str:
    token, token_hash = auth.new_token()
    db.add(AuthToken(token_hash=token_hash, user_id=user.id, expires_at=auth.token_expiry()))
    db.commit()
    return token


def _record(s: TypingSession) -> dict:
    created = s.created_at.replace(tzinfo=s.created_at.tzinfo or UTC)
    return {
        "at": int(created.timestamp() * 1000),
        "mission": s.mission,
        "level": s.level,
        "wpm": s.wpm,
        "accuracy": s.accuracy,
        "consistency": s.consistency,
        "repaired": s.repaired,
        "xp": s.xp,
        "stars": s.stars,
    }


def _save_data(db: Session, user: User) -> dict:
    recent = db.scalars(
        select(TypingSession).where(TypingSession.user_id == user.id).order_by(TypingSession.id.desc()).limit(HISTORY_LIMIT)
    ).all()
    progress = db.scalars(select(MissionProgress).where(MissionProgress.user_id == user.id)).all()
    return {
        "username": user.username,
        "xp": user.xp,
        "missions": {
            p.mission: {"level": p.level, "bestStars": p.best_stars, "bestWpm": p.best_wpm, "repairs": p.repairs} for p in progress
        },
        "history": [_record(s) for s in reversed(recent)],
        "profile": user.profile,
    }


def _routes(app: FastAPI) -> None:
    @app.get("/api/health")
    def health() -> dict:
        return {"status": "online"}

    # ----- accounts -----

    @app.post("/api/auth/register", status_code=201)
    def register(body: Credentials, db: DB) -> dict:
        if db.scalar(select(User).where(User.username == body.username)):
            raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
        user = User(username=body.username, password_hash=auth.hash_password(body.password))
        db.add(user)
        db.commit()
        return {"token": _issue_token(db, user), "username": user.username}

    @app.post("/api/auth/login")
    def login(body: Credentials, db: DB) -> dict:
        user = db.scalar(select(User).where(User.username == body.username))
        if not user or not auth.verify_password(body.password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")
        return {"token": _issue_token(db, user), "username": user.username}

    @app.post("/api/auth/logout", status_code=204)
    def logout(db: DB, user: CurrentUser, authorization: Annotated[str, Header()]) -> None:
        db.execute(delete(AuthToken).where(AuthToken.token_hash == auth.hash_token(authorization.removeprefix("Bearer "))))
        db.commit()

    @app.get("/api/me")
    def me(db: DB, user: CurrentUser) -> dict:
        return _save_data(db, user)

    @app.delete("/api/me/history", status_code=204)
    def clear_history(db: DB, user: CurrentUser) -> None:
        """Vision Section 12: users control their typing history."""
        db.execute(delete(TypingSession).where(TypingSession.user_id == user.id))
        db.execute(delete(MissionProgress).where(MissionProgress.user_id == user.id))
        user.xp = 0
        user.profile = None
        db.commit()

    @app.delete("/api/me", status_code=204)
    def delete_account(db: DB, user: CurrentUser) -> None:
        db.delete(user)
        db.commit()

    # ----- sessions -----

    @app.post("/api/sessions", status_code=201)
    def submit_session(body: SessionIn, db: DB, user: CurrentUser) -> dict:
        level = scoring.get_level(body.mission, body.level)
        if level is None:
            raise HTTPException(422, "Unknown mission or level")
        if body.passage not in level["passages"]:
            raise HTTPException(422, "Passage is not part of this level")
        length = len(body.passage)
        plausible = (
            body.errors <= body.keystrokes
            and body.correct_characters <= min(length, body.keystrokes - body.errors)
            and (not body.repaired or body.keystrokes >= length)
            and body.elapsed_seconds <= level["timeLimit"] + 2
            # time_left must match the elapsed time (it earns bonus XP).
            and body.time_left <= max(0, level["timeLimit"] - int(body.elapsed_seconds)) + 1
        )
        wpm, accuracy = scoring.wpm_and_accuracy(body.correct_characters, body.keystrokes, body.errors, body.elapsed_seconds)
        if not plausible or wpm > scoring.MAX_PLAUSIBLE_WPM:
            raise HTTPException(422, "Session data is inconsistent")

        xp, stars = scoring.rewards(wpm, accuracy, body.repaired, body.level, body.time_left, level["targetWpm"])
        progress = db.get(MissionProgress, (user.id, body.mission)) or MissionProgress(
            user_id=user.id, mission=body.mission, level=1, best_stars=0, best_wpm=0, repairs=0
        )
        decision = scoring.next_level(
            max(progress.level, body.level), len(scoring.MISSIONS[body.mission]["levels"]), wpm, accuracy, level["targetWpm"], body.repaired
        )
        progress.level = decision["level"]
        progress.best_stars = max(progress.best_stars, stars)
        if body.repaired:
            progress.best_wpm = max(progress.best_wpm, wpm)
            progress.repairs += 1
        db.add(progress)

        session = TypingSession(
            user_id=user.id, mission=body.mission, level=body.level, repaired=body.repaired, wpm=wpm, accuracy=accuracy,
            consistency=body.consistency, burst_wpm=body.burst_wpm, elapsed_seconds=body.elapsed_seconds,
            keystrokes=body.keystrokes, errors=body.errors, backspaces=body.backspaces, xp=xp, stars=stars, features=body.features,
        )
        db.add(session)
        user.xp += xp
        if body.profile is not None:
            user.profile = body.profile
        db.commit()
        return {"record": _record(session), "wpm": wpm, "accuracy": accuracy, "xp": xp, "stars": stars, "decision": decision}

    # ----- stateless helpers -----

    @app.post("/api/score")
    def score(body: ScoreRequest) -> dict:
        wpm, accuracy = scoring.wpm_and_accuracy(body.correct_characters, body.keystrokes, body.errors, body.elapsed_seconds)
        xp, stars = scoring.rewards(wpm, accuracy, body.repaired, body.level, body.time_left, body.target_wpm)
        return {"wpm": wpm, "accuracy": accuracy, "xp": xp, "stars": stars}

    @app.post("/api/passages/validate")
    def passages_validate(check: PassageCheck) -> dict:
        return scoring.validate_passage(check.text)


app = create_app()
