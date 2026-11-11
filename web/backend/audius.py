"""Finds full-length audio for a song on Audius (https://audius.co). Free, no key needed.

Anyone can upload to Audius, so results are filtered down to likely copies of the same recording.
"""

import re

import httpx

BASE_URL = "https://api.audius.co/v1"
APP_NAME = "lyric-typer"
MAX_CANDIDATES = 5
MAX_LENGTH_DIFFERENCE = 15  # seconds; further off is a different edit and the lyric timing won't fit
OTHER_VERSIONS = (
    "cover", "slow", "reverb", "nightcore", "remix", "spedup", "karaoke", "instrumental", "mashup", "typebeat", "acapella",
    "8d", "lofi", "flip", "singoff", "sings", "bootleg", "rework", "tribute", "parody",
)
COLLABORATION = re.compile(r"\s[x×]\s", re.IGNORECASE)  # "A x B - Song" is almost always a mashup
NOT_ALPHANUMERIC = re.compile(r"[^a-z0-9]")


class AudiusUnavailable(Exception):
    pass


def _squash(text: str) -> str:
    return NOT_ALPHANUMERIC.sub("", text.casefold())


def is_same_song(row: dict, title: str, artist: str, duration: float) -> bool:
    name = _squash(row.get("title") or "")
    uploader = _squash((row.get("user") or {}).get("name") or "")
    wanted_title, wanted_artist = _squash(title), _squash(artist)
    return (
        row.get("is_streamable", True)
        and bool(wanted_title) and wanted_title in name
        and wanted_artist in name + uploader
        and not any(word in name and word not in wanted_title for word in OTHER_VERSIONS)
        and not (COLLABORATION.search(row.get("title") or "") and not COLLABORATION.search(f" {title} "))
        and abs((row.get("duration") or 0) - duration) <= MAX_LENGTH_DIFFERENCE
    )


def find_tracks(http: httpx.Client, title: str, artist: str, duration: float) -> list[dict]:
    try:
        response = http.get(f"{BASE_URL}/tracks/search", params={"query": f"{artist} {title}", "app_name": APP_NAME}, timeout=15)
    except httpx.HTTPError:
        raise AudiusUnavailable from None
    if response.status_code != 200:
        raise AudiusUnavailable

    matches = [row for row in response.json().get("data", []) if is_same_song(row, title, artist, duration)]
    matches.sort(key=lambda row: abs(row["duration"] - duration))
    return [
        {
            "trackId": row["id"],
            "source": "audius",
            "title": row["title"],
            "uploader": row["user"]["name"],
            "duration": row["duration"],
            "streamUrl": f"{BASE_URL}/tracks/{row['id']}/stream?app_name={APP_NAME}",
        }
        for row in matches[:MAX_CANDIDATES]
    ]
