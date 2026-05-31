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


async def send_password_reset_email(*, to_email: str, reset_url: str) -> None:
    """Send password reset link. Logs the URL when Resend is not configured."""
    subject = "Сброс пароля — AI CMS"
    text = (
        "Здравствуйте!\n\n"
        "Вы запросили сброс пароля для AI CMS. Перейдите по ссылке:\n"
        f"{reset_url}\n\n"
        "Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте письмо."
    )
    html = (
        "<p>Здравствуйте!</p>"
        "<p>Вы запросили сброс пароля для AI CMS. Перейдите по ссылке:</p>"
        f'<p><a href="{reset_url}">{reset_url}</a></p>'
        "<p>Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.</p>"
    )

    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY is not set — email not sent. Password reset link for %s: %s",
            to_email,
            reset_url,
        )
        return

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "text": text,
                "html": html,
            },
        )
        if response.status_code >= 400:
            logger.error("Resend API error %s: %s", response.status_code, response.text)
            raise RuntimeError("Failed to send password reset email")
        logger.info("Password reset email queued via Resend for %s (id=%s)", to_email, response.json().get("id"))
