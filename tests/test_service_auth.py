"""Service auth and broker unit tests."""

import pytest

from shared.broker import MAX_MESSAGE_RETRIES, RETRY_HEADER
from shared.service_auth import INTERNAL_TOKEN_HEADER, is_valid_internal_token


def test_broker_retry_constants() -> None:
    assert MAX_MESSAGE_RETRIES == 3
    assert RETRY_HEADER == "x-retry-count"


def test_internal_token_header_name() -> None:
    assert INTERNAL_TOKEN_HEADER == "X-Internal-Service-Token"


@pytest.mark.asyncio
async def test_content_blocks_missing_internal_token(content_client, registered_user) -> None:
    response = await content_client.post(
        "/content",
        cookies=registered_user["cookies"],
        json={
            "title": "Blocked Article Title Example",
            "content": "This article should be blocked because the internal service token is missing.",
            "tags": [],
        },
    )
    assert response.status_code == 403


def test_is_valid_internal_token_with_starlette_request() -> None:
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/content",
        "headers": [
            (b"x-internal-service-token", b"test-internal-service-token"),
        ],
    }
    request = Request(scope)
    assert is_valid_internal_token(request) is True
