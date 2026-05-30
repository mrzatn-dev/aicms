"""Shared pytest fixtures."""

from __future__ import annotations

import os
import sys
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-internal-service-token")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASSWORD", "postgres")
os.environ.setdefault("DB_NAME", "cms_db")
os.environ.setdefault("DEBUG", "true")

from tests.service_loader import load_service_app


@pytest.fixture(scope="session")
def migrated_db() -> None:
    from apply_db import main as run_migrations

    run_migrations()


@pytest.fixture
def service_headers() -> dict[str, str]:
    return {"X-Internal-Service-Token": os.environ["INTERNAL_SERVICE_TOKEN"]}


@pytest.fixture
async def auth_client(migrated_db):
    app = load_service_app("auth_service", "auth_service_main")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def content_client(migrated_db):
    app = load_service_app("content-service", "content_service_main")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def ai_client(migrated_db):
    app = load_service_app("ai-service", "ai_service_main")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def gateway_client(migrated_db):
    gateway_path = os.path.join(ROOT, "api-gateway")
    if gateway_path not in sys.path:
        sys.path.insert(0, gateway_path)

    from main import app as gateway_app

    transport = ASGITransport(app=gateway_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def registered_user(auth_client):
    email = f"pytest-{uuid4().hex[:10]}@example.com"
    password = "secret123"
    username = f"user_{uuid4().hex[:8]}"

    response = await auth_client.post(
        "/register",
        json={
            "email": email,
            "username": username,
            "password": password,
            "full_name": "Pytest User",
        },
    )
    assert response.status_code == 201
    return {
        "email": email,
        "password": password,
        "username": username,
        "cookies": response.cookies,
        "user": response.json()["user"],
    }
