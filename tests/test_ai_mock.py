"""AI service tests with mocked NLP pipeline."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_ai_validate_content_internal(ai_client, service_headers) -> None:
    mocked = AsyncMock(
        return_value={
            "is_valid": True,
            "reason": "Content looks acceptable.",
            "score": 92,
        }
    )

    with patch("service.AIAnalysisService.validate_user_input", mocked):
        response = await ai_client.post(
            "/validate-content",
            headers=service_headers,
            json={
                "title": "Sample Article",
                "content": "This is a sufficiently long sample article body for AI validation testing.",
                "language": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    mocked.assert_awaited_once()


@pytest.mark.asyncio
async def test_ai_chat_requires_user_auth(ai_client, service_headers) -> None:
    response = await ai_client.post(
        "/chat",
        headers=service_headers,
        json={"message": "Hello", "language": "en"},
    )
    assert response.status_code == 401
