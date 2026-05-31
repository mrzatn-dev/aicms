"""Helpers for publishing analytics events via RabbitMQ."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from shared.broker import ANALYTICS_QUEUE, broker

logger = logging.getLogger(__name__)


async def publish_analytics_event(
    *,
    service: str,
    event_type: str,
    message: str,
    details: dict[str, Any] | None = None,
    level: str = "info",
) -> None:
    """Publish analytics event without breaking the main business flow."""
    payload = {
        "service": service,
        "event_type": event_type,
        "level": level,
        "message": message,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        if broker.connection is None or broker.connection.is_closed:
            await broker.connect()
        await broker.publish(ANALYTICS_QUEUE, payload)
    except Exception as exc:
        logger.warning("Failed to publish analytics event '%s': %s", event_type, exc)

