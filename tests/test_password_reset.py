"""Password reset and refresh token API tests."""

from uuid import uuid4

import pytest


@pytest.mark.asyncio
async def test_forgot_password_always_returns_message(auth_client) -> None:
    response = await auth_client.post(
        "/forgot-password",
        json={"email": f"unknown-{uuid4().hex}@example.com"},
    )
    assert response.status_code == 200
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_reset_password_invalid_token(auth_client) -> None:
    response = await auth_client.post(
        "/reset-password",
        json={"token": "invalid-token-value", "new_password": "newsecret123"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_refresh_requires_cookie(auth_client) -> None:
    response = await auth_client.post("/refresh")
    assert response.status_code == 401
