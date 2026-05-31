"""Transactional email helpers (Resend API)."""

from __future__ import annotations

import logging

import httpx

from shared.config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(*, to_email: str, verify_url: str) -> None:
    """Send email verification link. Logs the URL when Resend is not configured."""
    subject = "Подтвердите email — AI CMS"
    html = (
        "<p>Здравствуйте!</p>"
        "<p>Для завершения регистрации в AI CMS перейдите по ссылке:</p>"
        f'<p><a href="{verify_url}">{verify_url}</a></p>'
        "<p>Ссылка действительна 24 часа.</p>"
    )

    if not settings.RESEND_API_KEY:
        logger.info("Email verification link for %s: %s", to_email, verify_url)
        return

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
        )
        if response.status_code >= 400:
            logger.error("Resend API error %s: %s", response.status_code, response.text)
            raise RuntimeError("Failed to send verification email")
