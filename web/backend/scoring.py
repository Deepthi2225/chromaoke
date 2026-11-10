"""Deterministic scoring and difficulty rules (vision Sections 5.2, 5.3 and Principle 4).

These mirror web/src/engine/typing.ts and web/src/engine/difficulty.ts. The server
recomputes every score itself; it never trusts the numbers a client reports.
"""

import json
import math
import re
from pathlib import Path

CATALOGUE_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "missions.json"
MISSIONS: dict[str, dict] = {m["id"]: m for m in json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))}

ACCURACY_FLOOR = 88  # below this the engine steps down
PROMOTE_ACCURACY = 95  # at or above this (plus target WPM) the engine steps up
MAX_PLAUSIBLE_WPM = 250


def get_level(mission_id: str, level: int) -> dict | None:
    mission = MISSIONS.get(mission_id)
    if not mission or not 1 <= level <= len(mission["levels"]):
        return None
    return mission["levels"][level - 1]


def js_round(value: float) -> int:
    """Math.round from JavaScript (halves round up), so server and game agree exactly."""
    return math.floor(value + 0.5)


def wpm_and_accuracy(correct_characters: int, keystrokes: int, errors: int, elapsed_seconds: float) -> tuple[int, float]:
    wpm = js_round(correct_characters / 5 / (elapsed_seconds / 60))
    accuracy = js_round((keystrokes - errors) / keystrokes * 1000) / 10 if keystrokes else 100.0
    return wpm, accuracy


def rewards(wpm: int, accuracy: float, repaired: bool, level: int, time_left: int, target_wpm: int) -> tuple[int, int]:
    """XP and stars. Rewards depend on WPM, accuracy and completion time (vision Section 4)."""
    if not repaired:
        return js_round(wpm * 0.5), 0
    xp = js_round(40 + level * 20 + wpm * 1.5 + max(0, accuracy - 80) * 3 + time_left * 1.2)
    stars = 1 + int(accuracy >= PROMOTE_ACCURACY) + int(wpm >= target_wpm and accuracy >= 90)
    return xp, stars


def next_level(current: int, max_level: int, wpm: float, accuracy: float, target_wpm: int, repaired: bool) -> dict:
    """Rule-based adaptive engine. Speed only counts when accuracy holds up."""
    if not repaired or accuracy < ACCURACY_FLOOR:
        level = max(1, current - 1)
        return {"level": level, "change": level - current, "reason": "accuracy_or_timeout"}
    if accuracy >= PROMOTE_ACCURACY and wpm >= target_wpm:
        level = min(max_level, current + 1)
        return {"level": level, "change": level - current, "reason": "target_beaten"}
    return {"level": current, "change": 0, "reason": "hold"}


ALLOWED = re.compile(r"^[\x20-\x7E]+$")  # printable ASCII the typing engine can score
BLOCKLIST = {"password", "passwd"}  # extend with a proper content filter later


def validate_passage(text: str) -> dict:
    """Gate for AI-generated passages before they reach a player (vision Section 12)."""
    problems: list[str] = []
    if not 20 <= len(text) <= 600:
        problems.append("length must be 20-600 characters")
    if not ALLOWED.match(text):
        problems.append("only printable ASCII characters are allowed")
    if "  " in text or text != text.strip():
        problems.append("no leading, trailing or double spaces")
    if any(word in text.lower() for word in BLOCKLIST):
        problems.append("contains blocked content")
    return {"ok": not problems, "problems": problems}
