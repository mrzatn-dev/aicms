"""
API Gateway middleware: auth verification and rate limiting.
"""

import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from shared.auth import decode_access_token
from shared.cookie_auth import get_token_from_request
from shared.rate_limit import rate_limiter

logger = logging.getLogger(__name__)

# Endpoints that don't require authentication (any method)
PUBLIC_PATHS = {
    "/health",
    "/services/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/bootstrap-admin",
    "/api/auth/verify-email",
    "/api/auth/oauth-status",
    "/api/auth/google",
    "/api/auth/callback/google",
    "/api/auth/github",
    "/api/auth/callback/github",
    "/api/user/subscription/plans",
}

# Paths that are public for GET only
PUBLIC_GET_PREFIXES = [
    "/api/content/",
    "/api/categories",
    "/api/tags",
]

# Per-path limits: (max_requests, window_seconds)
AUTH_RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/auth/login": (10, 60),
    "/api/auth/register": (5, 300),
    "/api/auth/forgot-password": (3, 3600),
    "/api/auth/reset-password": (5, 3600),
    "/api/auth/refresh": (30, 60),
}

DEFAULT_RATE_LIMIT = (100, 60)


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT authentication middleware for gateway routes."""

    @staticmethod
    def is_public_path(path: str, method: str) -> bool:
        """Check if a path is publicly accessible."""
        if path in PUBLIC_PATHS:
            return True

        if method == "GET" and path in {"/api/content", "/api/categories", "/api/tags"}:
            return True

        if method == "GET":
            for prefix in PUBLIC_GET_PREFIXES:
                if path.startswith(prefix):
                    return True

        return False

    @staticmethod
    def verify_token(request: Request) -> dict | None:
        """Verify JWT token from cookie or Authorization header."""
        token = get_token_from_request(request, request.headers.get("Authorization"))
        if not token:
            return None

        try:
            return decode_access_token(token)
        except Exception:
            return None

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if self.is_public_path(path, request.method):
            return await call_next(request)

        payload = self.verify_token(request)
        if payload is None:
            return Response(
                content='{"detail":"Not authenticated"}',
                status_code=401,
                media_type="application/json",
                headers={"WWW-Authenticate": "Bearer"},
            )

        request.state.user = payload
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-backed rate limiting with in-memory fallback."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        max_requests, window_seconds = AUTH_RATE_LIMITS.get(path, DEFAULT_RATE_LIMIT)
        key = f"{client_ip}:{path}"

        if not await rate_limiter.allow(key, max_requests, window_seconds):
            logger.warning("Rate limit exceeded for %s on %s", client_ip, path)
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
            )

        return await call_next(request)
