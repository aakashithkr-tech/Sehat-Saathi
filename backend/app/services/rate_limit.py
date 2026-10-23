import threading
import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    """In-memory limiter. Fine for a single process; use Redis or a gateway limit when scaling out."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> int:
        """Record a hit. Returns 0 if allowed, else seconds until retry."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] >= window:
                q.popleft()
            if len(q) >= limit:
                return max(1, int(window - (now - q[0])) + 1)
            q.append(now)
            return 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


contact_limiter = SlidingWindowLimiter()
