"""Content service integration tests."""

import pytest


@pytest.mark.asyncio
async def test_content_requires_internal_token(content_client, registered_user) -> None:
    response = await content_client.get(
        "/content",
        cookies=registered_user["cookies"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_and_list_article(content_client, registered_user, service_headers) -> None:
    headers = service_headers
    cookies = registered_user["cookies"]

    create_response = await content_client.post(
        "/content",
        headers=headers,
        cookies=cookies,
        json={
            "title": "Integration Test Article Title",
            "content": "This is a long enough article body for validation rules in the CMS test suite.",
            "tags": ["pytest"],
        },
    )
    assert create_response.status_code == 201
    article = create_response.json()
    assert article["title"].startswith("Integration Test Article")

    list_response = await content_client.get("/content", headers=headers)
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] >= 1
