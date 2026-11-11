"""Server-side scoring. Mirrors web/src/engine/typing.ts so a client's reported numbers are never trusted."""

import math

MAX_PLAUSIBLE_WPM = 250


def js_round(value: float) -> int:
    """Math.round from JavaScript (halves round up), so server and browser agree exactly."""
    return math.floor(value + 0.5)


def wpm_and_accuracy(correct_characters: int, keystrokes: int, errors: int, elapsed_seconds: float) -> tuple[int, float]:
    wpm = js_round(correct_characters / 5 / (elapsed_seconds / 60))
    accuracy = js_round((keystrokes - errors) / keystrokes * 1000) / 10 if keystrokes else 100.0
    return wpm, accuracy
