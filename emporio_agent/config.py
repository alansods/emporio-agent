"""Settings read from the environment at call time, plus fixed limits."""

import os
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DEFAULT_REFERENCE_DATE = "2026-03-23"
DEFAULT_MODEL = "gemini-3.5-flash-lite"
MAX_TOOL_ROUNDS = 5
MODEL_TIMEOUT_MS = 15_000
SEARCH_RESULT_LIMIT = 8
MAX_MESSAGES = 20
MAX_MESSAGE_CHARS = 2000
CHAT_RATE_LIMIT = 10
CHAT_RATE_WINDOW_SECONDS = 60


def reference_date() -> date:
    """The date treated as "today" by every date rule (the data is a March 2026 snapshot)."""
    return date.fromisoformat(os.getenv("REFERENCE_DATE") or DEFAULT_REFERENCE_DATE)


def model_name() -> str:
    return os.getenv("MODEL") or DEFAULT_MODEL
