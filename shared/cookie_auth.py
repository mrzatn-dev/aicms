"""
HttpOnly JWT cookie helpers for browser sessions.
"""

from datetime import timedelta

from fastapi import Request, Response

from shared.config import settings

AUTH_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _cookie_max_age() -> int:
    return int(timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds())


def _refresh_cookie_max_age() -> int:
    return int(timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())


def _cookie_secure(request: Request | None = None) -> bool:
    if settings.DEBUG:
        return False
    for url in (settings.OAUTH_API_BASE_URL, settings.OAUTH_REDIRECT_URI):
        if (url or "").startswith("https://"):
            return True
    if request is not None:
        proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        if proto == "https":
            return True
    return False


def set_auth_cookie(response: Response, token: str, request: Request | None = None) -> None:
    """Attach JWT as an HttpOnly cookie."""
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
        max_age=_cookie_max_age(),
        path="/",
    )


def set_refresh_cookie(response: Response, token: str, request: Request | None = None) -> None:
    """Attach refresh token as an HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
        max_age=_refresh_cookie_max_age(),
        path="/api/auth",
    )


def clear_auth_cookie(response: Response, request: Request | None = None) -> None:
    """Remove auth cookies."""
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
    )


def get_refresh_token_from_request(request: Request) -> str | None:
    """Read refresh token from HttpOnly cookie."""
    return request.cookies.get(REFRESH_COOKIE_NAME)


def get_token_from_request(request: Request, authorization: str | None = None) -> str | None:
    """Read JWT from Authorization header or HttpOnly cookie."""
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    return request.cookies.get(AUTH_COOKIE_NAME)
