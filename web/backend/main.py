"""Chromaoke API.

Run from the repository root:
    uvicorn main:app --reload --app-dir web/backend
"""

import re
from collections.abc import Iterator
from contextlib import asynccontextmanager
from datetime import UTC, timedelta
from typing import Annotated, Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

import auth
import artwork
import audius
import saavn
import scoring
from db import AuthToken, Database, KeyTotals, SongResult, User, now
from lyrics import LyricsClient, LyricsUnavailable, SongNotFound

USERNAME = re.compile(r"^[A-Za-z0-9_]{3,24}$")
HISTORY_LIMIT = 200
ART_CACHE_SIZE = 512
LEADERBOARD_SIZE = 10
LEADERBOARD_MIN_COMPLETION = 90  # percent; stops a fast first verse from topping the board
MAX_SESSION_SECONDS = 4 * 3600


class Credentials(BaseModel):
    username: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def check_username(cls, value: str) -> str:
        if not USERNAME.match(value):
            raise ValueError("3-24 letters, digits or underscores")
        return value.lower()


LETTER = re.compile(r"^[a-z]$")
LETTER_PAIR = re.compile(r"^[a-z]{2}$")
MAX_TALLY = 1_000_000


class KeyStatsIn(BaseModel):
    """Per letter and per letter pair: [times aimed at, times missed]."""

    keys: dict[str, tuple[int, int]] = Field(default_factory=dict)
    pairs: dict[str, tuple[int, int]] = Field(default_factory=dict)

    @field_validator("keys", "pairs")
    @classmethod
    def check_tallies(cls, value: dict, info) -> dict:
        name = LETTER if info.field_name == "keys" else LETTER_PAIR
        for key, (attempts, errors) in value.items():
            if not name.match(key) or not 0 <= errors <= attempts <= MAX_TALLY:
                raise ValueError("invalid key statistics")
        return value


class ResultIn(BaseModel):
    song_id: int
    mode: Literal["audio", "both", "text"]
    elapsed_seconds: float = Field(gt=0, le=MAX_SESSION_SECONDS)
    correct_characters: int = Field(ge=0)
    keystrokes: int = Field(ge=0, description="Character keystrokes, excluding Backspace")
    errors: int = Field(ge=0, description="Wrong keystrokes, even if fixed later")
    backspaces: int = Field(ge=0)
    consistency: int = Field(ge=0, le=100)
    burst_wpm: int = Field(ge=0, le=1000)
    completion: int = Field(ge=0, le=100, description="Percent of the song's words attempted")
    key_stats: KeyStatsIn | None = None


def create_app(
    database_url: str | None = None,
    http_client: httpx.Client | None = None,
) -> FastAPI:
    database = Database(database_url)
    http = http_client or httpx.Client(headers={"User-Agent": "lyric-typer/1.0"})

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        database.create_all()
        yield
        if http_client is None:
            http.close()

    app = FastAPI(title="Chromaoke API", version="1.0.0", lifespan=lifespan)
    app.state.db = database
    app.state.http = http
    app.state.lyrics = LyricsClient(http)
    app.state.art = {}
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


def _record(result: SongResult) -> dict:
    created = result.created_at.replace(tzinfo=result.created_at.tzinfo or UTC)
    return {
        "at": int(created.timestamp() * 1000),
        "songId": result.song_id,
        "title": result.title,
        "artist": result.artist,
        "mode": result.mode,
        "wpm": result.wpm,
        "accuracy": result.accuracy,
        "consistency": result.consistency,
        "completion": result.completion,
    }


def _best_per_typist(db: Session, wanted: list) -> list[dict]:
    """The top typists among the matching results, each counted once by their fastest run."""
    rows = db.execute(
        select(User.username, SongResult.wpm, SongResult.accuracy, SongResult.mode, SongResult.song_id, SongResult.title)
        .join(User, User.id == SongResult.user_id)
        .where(*wanted)
        .order_by(SongResult.wpm.desc(), SongResult.accuracy.desc(), SongResult.id)
        .limit(500)
    ).all()
    best: dict[str, dict] = {}
    for username, wpm, accuracy, mode, song_id, title in rows:
        best.setdefault(username, {"username": username, "wpm": wpm, "accuracy": accuracy, "mode": mode, "songId": song_id, "title": title})
    return list(best.values())[:LEADERBOARD_SIZE]


EMPTY_KEY_STATS = {"keys": {}, "pairs": {}}


def _add_key_stats(db: Session, user: User, added: KeyStatsIn) -> None:
    row = db.get(KeyTotals, user.id) or KeyTotals(user_id=user.id, stats=EMPTY_KEY_STATS)
    totals = {group: dict(row.stats.get(group, {})) for group in ("keys", "pairs")}
    for group, tallies in (("keys", added.keys), ("pairs", added.pairs)):
        for key, (attempts, errors) in tallies.items():
            before = totals[group].get(key, [0, 0])
            totals[group][key] = [before[0] + attempts, before[1] + errors]
    row.stats = totals  # a new dict, so the JSON column is seen as changed
    db.add(row)


def _load_song(request: Request, song_id: int) -> dict:
    try:
        return request.app.state.lyrics.song(song_id)
    except SongNotFound:
        raise HTTPException(404, "No lyrics found for that song") from None
    except LyricsUnavailable:
        raise HTTPException(502, "The lyrics service is unavailable right now") from None


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
        recent = db.scalars(
            select(SongResult).where(SongResult.user_id == user.id).order_by(SongResult.id.desc()).limit(HISTORY_LIMIT)
        ).all()
        totals = db.get(KeyTotals, user.id)
        return {"username": user.username, "history": [_record(r) for r in reversed(recent)], "keyStats": totals.stats if totals else EMPTY_KEY_STATS}

    @app.delete("/api/me/history", status_code=204)
    def clear_history(db: DB, user: CurrentUser) -> None:
        db.execute(delete(SongResult).where(SongResult.user_id == user.id))
        db.execute(delete(KeyTotals).where(KeyTotals.user_id == user.id))
        db.commit()

    @app.delete("/api/me", status_code=204)
    def delete_account(db: DB, user: CurrentUser) -> None:
        db.delete(user)
        db.commit()

    @app.post("/api/me/keys", status_code=204)
    def add_key_stats(body: KeyStatsIn, db: DB, user: CurrentUser) -> None:
        """Key statistics from a practice drill, which has no result of its own."""
        _add_key_stats(db, user, body)
        db.commit()

    # ----- songs -----

    @app.get("/api/songs/search")
    def search_songs(request: Request, q: Annotated[str, Query(min_length=2, max_length=120)]) -> dict:
        try:
            return {"results": request.app.state.lyrics.search(q)}
        except (LyricsUnavailable, SongNotFound):
            raise HTTPException(502, "The lyrics service is unavailable right now") from None

    @app.get("/api/songs/{song_id}")
    def get_song(request: Request, song_id: int) -> dict:
        return _load_song(request, song_id)

    @app.get("/api/songs/{song_id}/audio")
    def get_audio(request: Request, song_id: int) -> dict:
        song = _load_song(request, song_id)
        wanted = (request.app.state.http, song["title"], song["artist"], song["duration"])
        try:
            found, failed = audius.find_tracks(*wanted), False
        except audius.AudiusUnavailable:
            found, failed = [], True
        found += saavn.find_tracks(*wanted)
        # Whichever source has the recording closest in length to the timed lyrics goes first.
        found.sort(key=lambda track: abs(track["duration"] - song["duration"]))
        return {"candidates": found, "error": failed and not found}

    @app.get("/api/songs/{song_id}/art")
    def get_art(request: Request, song_id: int) -> dict:
        known = request.app.state.art
        if song_id not in known:
            song = _load_song(request, song_id)
            if len(known) >= ART_CACHE_SIZE:
                known.clear()
            known[song_id] = artwork.find(request.app.state.http, song["title"], song["artist"], song["duration"])
        return {"url": known[song_id]}

    @app.get("/api/songs/{song_id}/leaderboard")
    def leaderboard(song_id: int, db: DB, mode: Literal["audio", "both", "text"] | None = None, today: bool = False) -> dict:
        """Each signed-in typist's best near-complete run of this song: in one mode or all, ever or today (UTC)."""
        wanted = [SongResult.song_id == song_id, SongResult.completion >= LEADERBOARD_MIN_COMPLETION]
        if mode:
            wanted.append(SongResult.mode == mode)
        if today:
            wanted.append(SongResult.created_at >= now().replace(hour=0, minute=0, second=0, microsecond=0))
        return {"entries": _best_per_typist(db, wanted)}

    @app.get("/api/leaderboards")
    def leaderboards(db: DB) -> dict:
        """Site-wide boards: each typist's fastest near-complete run, and the songs played most in the last week."""
        played = func.count().label("plays")
        songs = db.execute(
            select(SongResult.song_id, func.max(SongResult.title), func.max(SongResult.artist), played)
            .where(SongResult.created_at >= now() - timedelta(days=7))
            .group_by(SongResult.song_id)
            .order_by(played.desc(), SongResult.song_id)
            .limit(LEADERBOARD_SIZE)
        ).all()
        return {
            "typists": _best_per_typist(db, [SongResult.completion >= LEADERBOARD_MIN_COMPLETION]),
            "songs": [{"songId": song_id, "title": title, "artist": artist, "plays": plays} for song_id, title, artist, plays in songs],
        }

    # ----- results -----

    @app.post("/api/results", status_code=201)
    def submit_result(request: Request, body: ResultIn, db: DB, user: CurrentUser) -> dict:
        song = _load_song(request, body.song_id)
        if not song["typeable"]:
            raise HTTPException(422, "This song's lyrics can't be typed on a standard keyboard")
        wpm, accuracy = scoring.wpm_and_accuracy(body.correct_characters, body.keystrokes, body.errors, body.elapsed_seconds)
        plausible = (
            body.errors <= body.keystrokes
            and body.correct_characters <= min(song["length"], body.keystrokes - body.errors)
            and wpm <= scoring.MAX_PLAUSIBLE_WPM
        )
        if not plausible:
            raise HTTPException(422, "Result data is inconsistent")
        result = SongResult(
            user_id=user.id, song_id=body.song_id, title=song["title"][:300], artist=song["artist"][:300], mode=body.mode,
            wpm=wpm, accuracy=accuracy, consistency=body.consistency, burst_wpm=body.burst_wpm, completion=body.completion,
            elapsed_seconds=body.elapsed_seconds, keystrokes=body.keystrokes, errors=body.errors, backspaces=body.backspaces,
        )
        db.add(result)
        if body.key_stats:
            _add_key_stats(db, user, body.key_stats)
        db.commit()
        return {"record": _record(result)}


app = create_app()
