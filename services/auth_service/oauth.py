"""
OAuth 2.0 helpers for Google.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import urllib.parse
from typing import Any

import httpx
from fastapi import HTTPException, Request, status
from fastapi.responses import RedirectResponse

from shared.config import settings
from shared.cookie_auth import set_auth_cookie

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def get_public_api_base_url(request: Request | None = None) -> str:
    """Public API URL used in OAuth redirect_uri (must match provider console)."""
    configured = (settings.OAUTH_API_BASE_URL or "").strip().rstrip("/")
    if configured and configured != "http://localhost:8000":
        return configured

    if request is not None:
        forwarded_host = request.headers.get("x-forwarded-host")
        forwarded_proto = request.headers.get("x-forwarded-proto")
        if forwarded_host:
            scheme = forwarded_proto or request.url.scheme
            return f"{scheme}://{forwarded_host}".rstrip("/")
        return str(request.base_url).rstrip("/")

    return configured or "http://localhost:8000"


def provider_callback_url(provider: str, request: Request | None = None) -> str:
    base = get_public_api_base_url(request)
    return f"{base}/api/auth/callback/{provider}"


def frontend_redirect_success(token: str) -> RedirectResponse:
    """Redirect to frontend after OAuth; JWT is stored in an HttpOnly cookie."""
    response = RedirectResponse(
        url=f"{settings.OAUTH_REDIRECT_URI.rstrip('/')}?oauth=success",
        status_code=status.HTTP_302_FOUND,
    )
    set_auth_cookie(response, token)
    return response


def frontend_redirect_with_error(message: str) -> str:
    base = settings.OAUTH_REDIRECT_URI.rstrip("/")
    return f"{base}?error={urllib.parse.quote(message)}"


def _make_state(provider: str) -> str:
    payload = json.dumps({"provider": provider, "nonce": secrets.token_urlsafe(16)})
    signature = hmac.new(
        settings.JWT_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    raw = f"{payload}.{signature}".encode()
    return base64.urlsafe_b64encode(raw).decode()


def _verify_state(state: str, provider: str) -> None:
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        payload, signature = decoded.rsplit(".", 1)
        expected = hmac.new(
            settings.JWT_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        data = json.loads(payload)
        if data.get("provider") != provider:
            raise ValueError("Provider mismatch")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        ) from exc


def _require_google_config() -> None:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )


def redirect_to_google(request: Request) -> RedirectResponse:
    _require_google_config()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": provider_callback_url("google", request),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": _make_state("google"),
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


async def _exchange_google_code(code: str, request: Request) -> dict[str, Any]:
    redirect_uri = provider_callback_url("google", request)
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Google authorization code",
            )

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token response missing access_token",
            )

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch Google user profile",
            )
        return user_resp.json()


async def handle_google_callback(
    code: str | None,
    state: str | None,
    error: str | None,
    auth_service,
    request: Request,
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            url=frontend_redirect_with_error(error),
            status_code=status.HTTP_302_FOUND,
        )
    if not code or not state:
        return RedirectResponse(
            url=frontend_redirect_with_error("Missing OAuth code"),
            status_code=status.HTTP_302_FOUND,
        )

    _require_google_config()
    _verify_state(state, "google")

    try:
        profile = await _exchange_google_code(code, request)
        email = profile.get("email")
        if not email:
            return RedirectResponse(
                url=frontend_redirect_with_error("Google account has no email"),
                status_code=status.HTTP_302_FOUND,
            )

        username_hint = (profile.get("email") or "user").split("@")[0]
        full_name = profile.get("name")
        token_response = await auth_service.oauth_login(email, username_hint, full_name)
        return frontend_redirect_success(token_response.access_token)
    except HTTPException as exc:
        return RedirectResponse(
            url=frontend_redirect_with_error(str(exc.detail)),
            status_code=status.HTTP_302_FOUND,
        )
    except Exception:
        return RedirectResponse(
            url=frontend_redirect_with_error("Google OAuth failed"),
            status_code=status.HTTP_302_FOUND,
        )
