"""Auth service API tests."""

from uuid import uuid4

import pytest


@pytest.mark.asyncio
async def test_auth_health(auth_client) -> None:
    response = await auth_client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "auth-service"


@pytest.mark.asyncio
async def test_register_login_profile_cookie_flow(auth_client) -> None:
    email = f"pytest-{uuid4().hex[:10]}@example.com"
    password = "secret123"

    register_response = await auth_client.post(
        "/register",
        json={
            "email": email,
            "username": f"user_{uuid4().hex[:8]}",
            "password": password,
            "full_name": "Pytest User",
        },
    )
    assert register_response.status_code == 201
    assert register_response.json()["user"]["email"] == email
    assert register_response.cookies.get("access_token")

    login_response = await auth_client.post(
        "/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    assert login_response.cookies.get("access_token")

    profile_response = await auth_client.get("/profile", cookies=login_response.cookies)
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == email


@pytest.mark.asyncio
async def test_logout_clears_cookie(auth_client) -> None:
    email = f"logout-{uuid4().hex[:10]}@example.com"
    password = "secret123"

    register_response = await auth_client.post(
        "/register",
        json={
            "email": email,
            "username": f"logout_{uuid4().hex[:8]}",
            "password": password,
            "full_name": "Logout User",
        },
    )
    cookies = register_response.cookies

    logout_response = await auth_client.post("/logout", cookies=cookies)
    assert logout_response.status_code == 200

    profile_response = await auth_client.get("/profile", cookies=logout_response.cookies)
    assert profile_response.status_code == 401
