"""
API Gateway middleware: auth verification and rate limiting.
"""

import time
import logging
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from shared.auth import decode_access_token

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
    "/api/auth/google",
    "/api/auth/callback/google",
}

# Paths that are public for GET only
PUBLIC_GET_PREFIXES = [
    "/api/content/",
    "/api/categories",
    "/api/tags",
]


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
    def verify_token(authorization: str | None) -> dict | None:
        """Verify JWT token from Authorization header."""
        if not authorization:
            return None

        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        try:
            return decode_access_token(parts[1])
        except Exception:
            return None

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if self.is_public_path(path, request.method):
            return await call_next(request)

        payload = self.verify_token(request.headers.get("Authorization"))
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
    """Simple in-memory rate limiting middleware."""

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            logger.warning("Rate limit exceeded for %s", client_ip)
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
            )

        self.requests[client_ip].append(now)
        response = await call_next(request)
        return response
