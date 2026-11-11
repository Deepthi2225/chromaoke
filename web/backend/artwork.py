"""Album artwork from the iTunes Search API (free, no key). Used only to colour the page."""

import re

import httpx

SEARCH_URL = "https://itunes.apple.com/search"
NOT_ALPHANUMERIC = re.compile(r"[^a-z0-9]")


def _squash(text: str) -> str:
    return NOT_ALPHANUMERIC.sub("", text.casefold())


def find(http: httpx.Client, title: str, artist: str, duration: float) -> str | None:
    """URL of the cover for this artist's release closest in length, or None."""
    try:
        response = http.get(SEARCH_URL, params={"term": f"{artist} {title}", "entity": "song", "limit": 8}, timeout=10)
        rows = response.json().get("results", []) if response.status_code == 200 else []
    except (httpx.HTTPError, ValueError):
        return None

    wanted = _squash(artist)

    def same_artist(row: dict) -> bool:
        name = _squash(row.get("artistName") or "")
        return bool(name and wanted and row.get("artworkUrl100")) and (wanted in name or name in wanted)

    matches = [row for row in rows if same_artist(row)]
    if not matches:
        return None
    best = min(matches, key=lambda row: abs(row.get("trackTimeMillis", 0) / 1000 - duration))
    return best["artworkUrl100"].replace("100x100", "600x600")
