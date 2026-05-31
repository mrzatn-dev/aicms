"""
OAuth 2.0 helpers for Google and GitHub.
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

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def _is_localhost_url(url: str) -> bool:
    lowered = (url or "").lower()
    return "localhost" in lowered or "127.0.0.1" in lowered


def get_public_api_base_url(request: Request | None = None) -> str:
    """Public API URL used in OAuth redirect_uri (must match provider console)."""
    configured = (settings.OAUTH_API_BASE_URL or "").strip().rstrip("/")
    if configured and not _is_localhost_url(configured):
        return configured

    if request is not None:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        if forwarded_host:
            host = forwarded_host.split(",")[0].strip()
            if not _is_localhost_url(host):
                scheme = forwarded_proto or "https"
                return f"{scheme}://{host}".rstrip("/")
        return str(request.base_url).rstrip("/")

    return configured or "http://localhost:8000"


def get_frontend_oauth_callback_url(request: Request | None = None) -> str:
    """Frontend URL that receives the user after OAuth (with ?oauth=success)."""
    configured = (settings.OAUTH_REDIRECT_URI or "").strip().rstrip("/")
    if configured and not _is_localhost_url(configured):
        return configured

    if request is not None:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
        if forwarded_host:
            host = forwarded_host.split(",")[0].strip()
            if not _is_localhost_url(host):
                scheme = forwarded_proto or "https"
                return f"{scheme}://{host}/oauth/callback"

    api_base = get_public_api_base_url(request)
    if api_base and not _is_localhost_url(api_base):
        return f"{api_base.rstrip('/')}/oauth/callback"

    return configured or "http://localhost:3000/oauth/callback"


def provider_callback_url(provider: str, request: Request | None = None) -> str:
    base = get_public_api_base_url(request)
    return f"{base}/api/auth/callback/{provider}"


def frontend_redirect_success(token: str, request: Request | None = None) -> RedirectResponse:
    """Redirect to frontend after OAuth; JWT is stored in an HttpOnly cookie."""
    response = RedirectResponse(
        url=f"{get_frontend_oauth_callback_url(request)}?oauth=success",
        status_code=status.HTTP_302_FOUND,
    )
    set_auth_cookie(response, token, request)
    return response


def frontend_redirect_with_error(message: str, request: Request | None = None) -> str:
    base = get_frontend_oauth_callback_url(request)
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
    missing = []
    if not settings.GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not settings.GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Google OAuth не настроен на API Gateway (aicms-9kw6). "
                f"Не заданы переменные: {', '.join(missing)}. "
                "Задайте их в Render → aicms-9kw6 → Environment и передеплойте gateway."
            ),
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
            url=frontend_redirect_with_error(error, request),
            status_code=status.HTTP_302_FOUND,
        )
    if not code or not state:
        return RedirectResponse(
            url=frontend_redirect_with_error("Missing OAuth code", request),
            status_code=status.HTTP_302_FOUND,
        )

    _require_google_config()
    _verify_state(state, "google")

    try:
        profile = await _exchange_google_code(code, request)
        email = profile.get("email")
        if not email:
            return RedirectResponse(
                url=frontend_redirect_with_error("Google account has no email", request),
                status_code=status.HTTP_302_FOUND,
            )

        username_hint = (profile.get("email") or "user").split("@")[0]
        full_name = profile.get("name")
        token_response = await auth_service.oauth_login(email, username_hint, full_name)
        return frontend_redirect_success(token_response.access_token, request)
    except HTTPException as exc:
        return RedirectResponse(
            url=frontend_redirect_with_error(str(exc.detail), request),
            status_code=status.HTTP_302_FOUND,
        )
    except Exception:
        return RedirectResponse(
            url=frontend_redirect_with_error("Google OAuth failed", request),
            status_code=status.HTTP_302_FOUND,
        )


def _require_github_config() -> None:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured",
        )


def redirect_to_github(request: Request) -> RedirectResponse:
    _require_github_config()
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": provider_callback_url("github", request),
        "scope": "read:user user:email",
        "state": _make_state("github"),
    }
    url = f"{GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


async def _exchange_github_code(code: str, request: Request) -> dict[str, Any]:
    redirect_uri = provider_callback_url("github", request)
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers=headers,
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange GitHub authorization code",
            )

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub token response missing access_token",
            )

        auth_header = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_resp = await client.get(GITHUB_USER_URL, headers=auth_header)
        if user_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch GitHub user profile",
            )
        profile = user_resp.json()

        email = profile.get("email")
        if not email:
            emails_resp = await client.get(GITHUB_EMAILS_URL, headers=auth_header)
            if emails_resp.status_code == 200:
                for item in emails_resp.json():
                    if item.get("primary") and item.get("verified"):
                        email = item.get("email")
                        break
                if not email:
                    for item in emails_resp.json():
                        if item.get("verified"):
                            email = item.get("email")
                            break

        profile["email"] = email
        profile["name"] = profile.get("name") or profile.get("login")
        return profile


async def handle_github_callback(
    code: str | None,
    state: str | None,
    error: str | None,
    auth_service,
    request: Request,
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            url=frontend_redirect_with_error(error, request),
            status_code=status.HTTP_302_FOUND,
        )
    if not code or not state:
        return RedirectResponse(
            url=frontend_redirect_with_error("Missing OAuth code", request),
            status_code=status.HTTP_302_FOUND,
        )

    _require_github_config()
    _verify_state(state, "github")

    try:
        profile = await _exchange_github_code(code, request)
        email = profile.get("email")
        if not email:
            return RedirectResponse(
                url=frontend_redirect_with_error("GitHub account has no verified email", request),
                status_code=status.HTTP_302_FOUND,
            )

        username_hint = profile.get("login") or email.split("@")[0]
        full_name = profile.get("name")
        token_response = await auth_service.oauth_login(email, username_hint, full_name)
        return frontend_redirect_success(token_response.access_token, request)
    except HTTPException as exc:
        return RedirectResponse(
            url=frontend_redirect_with_error(str(exc.detail), request),
            status_code=status.HTTP_302_FOUND,
        )
    except Exception:
        return RedirectResponse(
            url=frontend_redirect_with_error("GitHub OAuth failed", request),
            status_code=status.HTTP_302_FOUND,
        )
