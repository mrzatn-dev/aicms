"""
Service-to-service authentication via a shared internal token.

The API gateway (and trusted services) attach X-Internal-Service-Token on
outbound requests. Microservice ports reject callers without it.
"""

from __future__ import annotations

import secrets

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from shared.auth import decode_access_token
from shared.config import settings
from shared.cookie_auth import get_token_from_request

INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token"

SERVICE_PUBLIC_PATHS = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/register",
    "/login",
    "/logout",
    "/google",
    "/callback/google",
}


def is_valid_internal_token(request: Request) -> bool:
    """Return True when the request carries the configured internal token."""
    configured = settings.INTERNAL_SERVICE_TOKEN
    if not configured:
        return False

    provided = request.headers.get(INTERNAL_TOKEN_HEADER)
    if not provided:
        return False

    return secrets.compare_digest(provided, configured)


def has_valid_user_token(request: Request) -> bool:
    """Return True when a valid user JWT is present (direct test/dev access)."""
    token = get_token_from_request(request, request.headers.get("Authorization"))
    if not token:
        return False
    try:
        decode_access_token(token)
        return True
    except Exception:
        return False


def internal_service_headers() -> dict[str, str]:
    """Headers for trusted service-to-service HTTP calls."""
    if not settings.INTERNAL_SERVICE_TOKEN:
        return {}
    return {INTERNAL_TOKEN_HEADER: settings.INTERNAL_SERVICE_TOKEN}


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    """Block direct access to microservices without an internal service token."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path.rstrip("/") or "/"
        if path in SERVICE_PUBLIC_PATHS or request.url.path in SERVICE_PUBLIC_PATHS:
            return await call_next(request)

        if not settings.INTERNAL_SERVICE_TOKEN:
            return await call_next(request)

        if is_valid_internal_token(request) or has_valid_user_token(request):
            return await call_next(request)

        return Response(
            content='{"detail":"Forbidden: internal service token required"}',
            status_code=403,
            media_type="application/json",
        )


def add_service_auth_middleware(app) -> None:
    """Register internal service auth middleware on a FastAPI app."""
    app.add_middleware(ServiceAuthMiddleware)
