"""Database models: users, sign-in tokens and per-song results.

DATABASE_URL selects the database:
  - unset:      SQLite file web/backend/lyric_typer.db (local development)
  - PostgreSQL: postgresql+psycopg://lyrics:lyrics@localhost:5432/lyric_typer
"""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DEFAULT_URL = f"sqlite:///{Path(__file__).resolve().parent / 'lyric_typer.db'}"


def now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    results: Mapped[list["SongResult"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tokens: Mapped[list["AuthToken"]] = relationship(cascade="all, delete-orphan")
    key_totals: Mapped[list["KeyTotals"]] = relationship(cascade="all, delete-orphan")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    # Only a SHA-256 of the token is stored, so a database leak does not leak sessions.
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SongResult(Base):
    """One attempt at one song. Holds numbers and the song's name only, never the lyrics or typed text."""

    __tablename__ = "song_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    song_id: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(300))
    artist: Mapped[str] = mapped_column(String(300))
    mode: Mapped[str] = mapped_column(String(8))
    wpm: Mapped[int] = mapped_column(Integer)
    accuracy: Mapped[float] = mapped_column(Float)
    consistency: Mapped[int] = mapped_column(Integer)
    burst_wpm: Mapped[int] = mapped_column(Integer)
    completion: Mapped[int] = mapped_column(Integer)
    elapsed_seconds: Mapped[float] = mapped_column(Float)
    keystrokes: Mapped[int] = mapped_column(Integer)
    errors: Mapped[int] = mapped_column(Integer)
    backspaces: Mapped[int] = mapped_column(Integer)

    user: Mapped[User] = relationship(back_populates="results")


class KeyTotals(Base):
    """How often a user has aimed at and missed each letter and letter pair. Counts only, never typed text."""

    __tablename__ = "key_totals"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    stats: Mapped[dict] = mapped_column(JSON)


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
