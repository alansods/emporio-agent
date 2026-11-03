"""In-memory fixed-window rate limit per key (client IP), per process, not shared."""

import math
import threading
import time
from collections.abc import Callable


class RateLimited(Exception):
    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__("rate_limited")
        self.retry_after_seconds = retry_after_seconds


class RateLimiter:
    """Allows `limit` checks per key in each window that starts at the key's first check."""

    def __init__(
        self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._limit = limit
        self._window_seconds = window_seconds
        self._clock = clock
        self._windows: dict[str, tuple[float, int]] = {}
        self._lock = threading.Lock()

    def __len__(self) -> int:
        return len(self._windows)

    def check(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            self._drop_expired(now)
            start, count = self._windows.get(key, (now, 0))
            if count >= self._limit:
                raise RateLimited(math.ceil(start + self._window_seconds - now))
            self._windows[key] = (start, count + 1)

    def _drop_expired(self, now: float) -> None:
        expired = [
            key for key, (start, _) in self._windows.items() if now - start >= self._window_seconds
        ]
        for key in expired:
            del self._windows[key]
