"""Redis-backed rate limiting with in-memory fallback."""

from __future__ import annotations

import logging
import time
from collections import defaultdict

from shared.redis_cache import redis_cache

logger = logging.getLogger(__name__)


class RateLimiter:
    """Fixed-window request limiter."""

    def __init__(self) -> None:
        self._memory: dict[str, list[float]] = defaultdict(list)

    async def allow(self, key: str, max_requests: int, window_seconds: int) -> bool:
        if max_requests <= 0:
            return True

        if redis_cache.client is not None:
            redis_key = f"rl:{key}:{window_seconds}"
            try:
                count = await redis_cache.incr(redis_key, window_seconds)
                return count <= max_requests
            except Exception as exc:
                logger.warning("Redis rate limit failed, using memory fallback: %s", exc)

        now = time.time()
        bucket = self._memory[key]
        self._memory[key] = [stamp for stamp in bucket if now - stamp < window_seconds]
        if len(self._memory[key]) >= max_requests:
            return False
        self._memory[key].append(now)
        return True


rate_limiter = RateLimiter()
