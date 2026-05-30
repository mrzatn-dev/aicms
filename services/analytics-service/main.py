"""
Analytics Service - System metrics and dashboards.
Runs on port 8005.
"""

import sys
import os
import logging
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, async_session_factory
from shared.schemas.analytics import AnalyticsDashboard
from shared.auth import require_admin
from shared.broker import broker, ANALYTICS_QUEUE
from shared.redis_cache import redis_cache
from shared.service_auth import add_service_auth_middleware

from service import AnalyticsService
from repository import AnalyticsRepository

logger = logging.getLogger(__name__)


async def handle_analytics_event(message: dict) -> None:
    """Persist analytics events and invalidate Redis cache."""
    logger.info("Received analytics event: %s", message.get("event_type"))
    async with async_session_factory() as session:
        try:
            repo = AnalyticsRepository(session)
            await repo.create_system_log(
                service=message.get("service", "unknown"),
                level=message.get("level", "info"),
                message=message.get("message", "Analytics event"),
                details={
                    "event_type": message.get("event_type"),
                    **(message.get("details") or {}),
                },
                created_at=(
                    datetime.fromisoformat(message["created_at"])
                    if message.get("created_at")
                    else None
                ),
            )
            await session.commit()
            await redis_cache.delete_pattern("analytics:*")
        except Exception as exc:
            await session.rollback()
            logger.error("Failed to handle analytics event: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Analytics Service starting...")
    await redis_cache.connect()
    try:
        await broker.connect()
        await broker.consume(ANALYTICS_QUEUE, handle_analytics_event)
        logger.info("Consuming analytics events from queue")
    except Exception as exc:
        logger.warning("Could not connect to RabbitMQ for analytics events: %s", exc)
    yield
    await broker.disconnect()
    await redis_cache.disconnect()
    logger.info("Analytics Service shutting down...")


app = FastAPI(
    title="Analytics Service",
    description="System metrics, dashboards, and analytics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

add_service_auth_middleware(app)


def get_analytics_service(
    session: AsyncSession = Depends(get_session),
) -> AnalyticsService:
    return AnalyticsService(AnalyticsRepository(session), cache=redis_cache)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics-service"}


@app.get("/dashboard", response_model=AnalyticsDashboard)
async def get_dashboard(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get analytics dashboard data (admin only)."""
    return await service.get_dashboard()


@app.get("/stats/content")
async def get_content_stats(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get content statistics."""
    return await service.get_content_stats()


@app.get("/stats/users")
async def get_user_stats(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get user statistics."""
    return await service.get_user_stats()


@app.get("/stats/validation")
async def get_validation_stats(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get validation statistics."""
    return await service.get_validation_stats()


@app.get("/stats/ai")
async def get_ai_stats(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get AI analysis statistics."""
    return await service.get_ai_stats()


@app.get("/logs")
async def get_system_logs(
    skip: int = 0,
    limit: int = 100,
    service_name: str | None = None,
    level: str | None = None,
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get system logs (admin only)."""
    return await service.get_system_logs(
        skip=skip, limit=limit, service_name=service_name, level=level
    )


@app.get("/system-monitor")
async def get_system_monitor(
    current_user: dict = Depends(require_admin),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get system monitor data for admin dashboard."""
    return await service.get_system_monitor()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8005)
