"""Async Redis cache helpers with graceful fallback."""

from __future__ import annotations

import json
import logging
from typing import Any

from shared.config import settings

logger = logging.getLogger(__name__)

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover - import fallback for environments without redis
    Redis = None


class RedisCache:
    """Thin wrapper around Redis for JSON cache values."""

    def __init__(self):
        self.client: Redis | None = None

    async def connect(self) -> None:
        if Redis is None:
            logger.warning("redis package is not installed; cache disabled")
            return
        try:
            self.client = Redis.from_url(settings.redis_url, decode_responses=True)
            await self.client.ping()
            logger.info("Connected to Redis at %s", settings.REDIS_HOST)
        except Exception as exc:
            logger.warning("Failed to connect to Redis: %s", exc)
            self.client = None

    async def disconnect(self) -> None:
        if self.client is not None:
            await self.client.aclose()
            self.client = None

    async def get_json(self, key: str) -> dict[str, Any] | None:
        if self.client is None:
            return None
        value = await self.client.get(key)
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, value: dict[str, Any], ttl: int = 60) -> None:
        if self.client is None:
            return
        await self.client.set(key, json.dumps(value, default=str), ex=ttl)

    async def delete_pattern(self, pattern: str) -> None:
        if self.client is None:
            return
        keys = await self.client.keys(pattern)
        if keys:
            await self.client.delete(*keys)


redis_cache = RedisCache()
