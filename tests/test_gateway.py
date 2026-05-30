"""API Gateway integration tests."""

from uuid import uuid4

import pytest


@pytest.mark.asyncio
async def test_gateway_health(gateway_client) -> None:
    response = await gateway_client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "api-gateway"


@pytest.mark.asyncio
async def test_gateway_auth_login(gateway_client) -> None:
    email = f"gateway-{uuid4().hex[:8]}@example.com"

    register = await gateway_client.post(
        "/api/auth/register",
        json={
            "email": email,
            "username": f"gw_{uuid4().hex[:6]}",
            "password": "secret123",
            "full_name": "Gateway User",
        },
    )
    assert register.status_code == 201

    login = await gateway_client.post(
        "/api/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert login.status_code == 200
    assert login.cookies.get("access_token")

    profile = await gateway_client.get("/api/auth/profile", cookies=login.cookies)
    assert profile.status_code == 200
    assert profile.json()["email"] == email
