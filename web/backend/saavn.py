"""Fallback audio from JioSaavn, through an unofficial community-run API.

JioSaavn has no public API, so this can stop working without notice. Every failure
returns no results instead of an error. Meant for local use and demos, not a public deployment.
Set SAAVN_API_URL to another instance, or to an empty string to turn this source off.
"""

import html
import os

import httpx

from audius import is_same_song

DEFAULT_URL = "https://jiosavan-api2.vercel.app/api"
PREFERRED_QUALITY = "160kbps"
MAX_CANDIDATES = 3


def find_tracks(http: httpx.Client, title: str, artist: str, duration: float) -> list[dict]:
    base = os.environ.get("SAAVN_API_URL", DEFAULT_URL).rstrip("/")
    if not base:
        return []
    try:
        response = http.get(f"{base}/search/songs", params={"query": f"{title} {artist}", "limit": 10}, timeout=10)
        rows = response.json()["data"]["results"] if response.status_code == 200 else []
        found = []
        for row in rows:
            name = html.unescape(row["name"])
            singers = ", ".join(html.unescape(a["name"]) for a in row["artists"]["primary"])
            length = int(row.get("duration") or 0)
            urls = {link["quality"]: link["url"] for link in row.get("downloadUrl") or []}
            if not urls or not is_same_song({"title": name, "user": {"name": singers}, "duration": length}, title, artist, duration):
                continue
            found.append({
                "trackId": f"saavn-{row['id']}",
                "source": "jiosaavn",
                "title": name,
                "uploader": singers,
                "duration": length,
                "streamUrl": urls.get(PREFERRED_QUALITY) or list(urls.values())[-1],
            })
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return []
    found.sort(key=lambda track: abs(track["duration"] - duration))
    return found[:MAX_CANDIDATES]
