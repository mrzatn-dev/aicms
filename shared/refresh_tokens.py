"""Opaque refresh tokens stored in Redis."""

from __future__ import annotations

import hashlib
import secrets
import uuid

from shared.config import settings
from shared.redis_cache import redis_cache

REFRESH_KEY_PREFIX = "auth:refresh:"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _redis_key(token: str) -> str:
    return f"{REFRESH_KEY_PREFIX}{_hash_token(token)}"


async def issue_refresh_token(*, user_id: uuid.UUID, email: str, role: str) -> str:
    """Create a new refresh token and persist session metadata in Redis."""
    token = secrets.token_urlsafe(32)
    ttl_seconds = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    await redis_cache.set_json(
        _redis_key(token),
        {"sub": str(user_id), "email": email, "role": role},
        ttl=ttl_seconds,
    )
    return token


async def consume_refresh_token(token: str) -> dict | None:
    """Load refresh session; returns None if missing or invalid."""
    if not token:
        return None
    return await redis_cache.get_json(_redis_key(token))


async def revoke_refresh_token(token: str) -> None:
    """Remove a refresh token from Redis."""
    if not token:
        return
    await redis_cache.delete(_redis_key(token))


async def rotate_refresh_token(old_token: str, *, user_id: uuid.UUID, email: str, role: str) -> str | None:
    """Validate old refresh token, revoke it, and issue a new one."""
    session = await consume_refresh_token(old_token)
    if not session:
        return None
    if str(session.get("sub")) != str(user_id):
        return None
    await revoke_refresh_token(old_token)
    return await issue_refresh_token(user_id=user_id, email=email, role=role)
