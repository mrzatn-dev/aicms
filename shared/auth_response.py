"""Build auth HTTP responses with access + refresh cookies."""

from __future__ import annotations

import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

from shared.cookie_auth import set_auth_cookie, set_refresh_cookie
from shared.refresh_tokens import issue_refresh_token
from shared.schemas.user import TokenResponse


async def build_token_response(
    token_response: TokenResponse,
    request: Request | None = None,
) -> JSONResponse:
    """Return token JSON and set HttpOnly access + refresh cookies."""
    response = JSONResponse(content=token_response.model_dump(mode="json"))
    set_auth_cookie(response, token_response.access_token, request)
    refresh_token = await issue_refresh_token(
        user_id=token_response.user.id,
        email=token_response.user.email,
        role=token_response.user.role,
    )
    set_refresh_cookie(response, refresh_token, request)
    return response
