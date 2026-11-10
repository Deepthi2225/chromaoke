"""Database models (vision Section 8: users, sessions, missions, history).

DATABASE_URL selects the database:
  - unset:      SQLite file web/backend/robot_repair.db (local development)
  - PostgreSQL: postgresql+psycopg://robot:robot@localhost:5432/robot_repair
"""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DEFAULT_URL = f"sqlite:///{Path(__file__).resolve().parent / 'robot_repair.db'}"


def now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    xp: Mapped[int] = mapped_column(Integer, default=0)
    # Aggregated typing profile (severity scores, per-key and per-pair counts). No raw text.
    profile: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    sessions: Mapped[list["TypingSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress: Mapped[list["MissionProgress"]] = relationship(cascade="all, delete-orphan")
    tokens: Mapped[list["AuthToken"]] = relationship(cascade="all, delete-orphan")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    # Only a SHA-256 of the token is stored, so a database leak does not leak sessions.
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TypingSession(Base):
    """One repair attempt. `features` is the per-session feature set the Phase 4 ML model trains on."""

    __tablename__ = "typing_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    mission: Mapped[str] = mapped_column(String(16))
    level: Mapped[int] = mapped_column(Integer)
    repaired: Mapped[bool] = mapped_column(Boolean)
    wpm: Mapped[int] = mapped_column(Integer)
    accuracy: Mapped[float] = mapped_column(Float)
    consistency: Mapped[int] = mapped_column(Integer)
    burst_wpm: Mapped[int] = mapped_column(Integer)
    elapsed_seconds: Mapped[float] = mapped_column(Float)
    keystrokes: Mapped[int] = mapped_column(Integer)
    errors: Mapped[int] = mapped_column(Integer)
    backspaces: Mapped[int] = mapped_column(Integer)
    xp: Mapped[int] = mapped_column(Integer)
    stars: Mapped[int] = mapped_column(Integer)
    features: Mapped[dict] = mapped_column(JSON)

    user: Mapped[User] = relationship(back_populates="sessions")


class MissionProgress(Base):
    __tablename__ = "mission_progress"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    mission: Mapped[str] = mapped_column(String(16), primary_key=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
    best_stars: Mapped[int] = mapped_column(Integer, default=0)
    best_wpm: Mapped[int] = mapped_column(Integer, default=0)
    repairs: Mapped[int] = mapped_column(Integer, default=0)


class Database:
    def __init__(self, url: str | None = None):
        self.url = url or os.environ.get("DATABASE_URL") or DEFAULT_URL
        args = {"check_same_thread": False} if self.url.startswith("sqlite") else {}
        self.engine = create_engine(self.url, connect_args=args, pool_pre_ping=True)
        self.make_session = sessionmaker(self.engine, expire_on_commit=False)

    def create_all(self) -> None:
        Base.metadata.create_all(self.engine)

    def session(self) -> Iterator[Session]:
        with self.make_session() as session:
            yield session
