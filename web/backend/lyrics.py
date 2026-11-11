"""Song search and lyrics from LRCLIB (https://lrclib.net), cleaned into text a keyboard can type."""

import re
import threading
import unicodedata
from collections import OrderedDict

import httpx

BASE_URL = "https://lrclib.net/api"
SEARCH_LIMIT = 20
CACHE_SIZE = 256
MIN_LATIN_SHARE = 0.9

TIMESTAMP = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]")
SECTION_TAG = re.compile(r"^\[.*\]$")
SPACES = re.compile(r"\s+")
REPLACEMENTS = str.maketrans({
    "‘": "'", "’": "'", "ʼ": "'", "´": "'", "`": "'",
    "“": '"', "”": '"',
    "–": "-", "—": "-", "−": "-",
    "…": "...", " ": " ",
    "ß": "ss", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE",
    "ø": "o", "Ø": "O", "ł": "l", "Ł": "L", "đ": "d", "Đ": "D",
})


class LyricsUnavailable(Exception):
    """LRCLIB could not be reached or returned something unusable."""


class SongNotFound(Exception):
    pass


def clean_line(text: str) -> str:
    """Curly quotes, accents and dashes become their plain keyboard forms; anything else untypeable is dropped."""
    decomposed = unicodedata.normalize("NFKD", text.translate(REPLACEMENTS))
    ascii_only = "".join(c for c in decomposed if " " <= c <= "~")
    return SPACES.sub(" ", ascii_only).strip()


def is_typeable(text: str) -> bool:
    """False for lyrics mostly in a non-Latin script, which a standard keyboard session cannot score."""
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    latin = sum(1 for c in letters if clean_line(c))
    return latin / len(letters) >= MIN_LATIN_SHARE


def parse_synced(synced: str) -> list[dict]:
    lines = []
    for raw in synced.splitlines():
        stamps = TIMESTAMP.findall(raw)
        text = clean_line(TIMESTAMP.sub("", raw))
        if text and not SECTION_TAG.match(text):
            lines.extend({"t": int(minutes) * 60 + float(seconds), "text": text} for minutes, seconds in stamps)
    return sorted(lines, key=lambda line: line["t"])


def parse_plain(plain: str) -> list[dict]:
    cleaned = (clean_line(raw) for raw in plain.splitlines())
    return [{"t": None, "text": text} for text in cleaned if text and not SECTION_TAG.match(text)]


def _raw_text(record: dict) -> str:
    return record.get("plainLyrics") or TIMESTAMP.sub("", record.get("syncedLyrics") or "")


def clean_title(title: str, artist: str) -> str:
    """Some uploads are named "Artist - Song"; the artist is already shown separately."""
    prefix = f"{artist} - "
    return title[len(prefix):] if title.casefold().startswith(prefix.casefold()) and len(title) > len(prefix) else title


def summary(record: dict) -> dict:
    album = record.get("albumName") or ""
    return {
        "id": record["id"],
        "title": clean_title(record["trackName"], record["artistName"]),
        "artist": record["artistName"],
        "album": "" if album == record["trackName"] else album,
        "duration": record.get("duration") or 0,
        "synced": bool(record.get("syncedLyrics")),
        "typeable": is_typeable(_raw_text(record)),
    }


class LyricsClient:
    def __init__(self, http: httpx.Client):
        self.http = http
        self._songs: OrderedDict[int, dict] = OrderedDict()
        self._lock = threading.Lock()

    def _get(self, path: str, params: dict | None = None) -> httpx.Response:
        try:
            response = self.http.get(f"{BASE_URL}{path}", params=params, timeout=15)
        except httpx.HTTPError as error:
            raise LyricsUnavailable from error
        if response.status_code == 404:
            raise SongNotFound
        if response.status_code != 200:
            raise LyricsUnavailable
        return response

    def search(self, query: str) -> list[dict]:
        """One row per song: LRCLIB lists every album release of a track, so duplicates are merged, preferring timed lyrics."""
        merged: dict[tuple[str, str], dict] = {}
        for record in self._get("/search", {"q": query}).json():
            if record.get("instrumental") or not _raw_text(record).strip():
                continue
            row = summary(record)
            key = (row["title"].casefold(), row["artist"].casefold())
            if key not in merged or (row["synced"] and not merged[key]["synced"]):
                merged[key] = row
        return sorted(merged.values(), key=lambda row: not row["typeable"])[:SEARCH_LIMIT]

    def song(self, song_id: int) -> dict:
        with self._lock:
            if song_id in self._songs:
                self._songs.move_to_end(song_id)
                return self._songs[song_id]

        record = self._get(f"/get/{song_id}").json()
        lines = parse_synced(record.get("syncedLyrics") or "") or parse_plain(record.get("plainLyrics") or "")
        if record.get("instrumental") or not lines:
            raise SongNotFound
        song = {
            **summary(record),
            "synced": lines[0]["t"] is not None,
            "lines": lines,
            "length": len(" ".join(line["text"] for line in lines)),
        }
        with self._lock:
            self._songs[song_id] = song
            if len(self._songs) > CACHE_SIZE:
                self._songs.popitem(last=False)
        return song
