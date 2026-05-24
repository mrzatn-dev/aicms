"""
Analytics service business logic.
"""

import asyncio
import time
from typing import Any

import httpx

from shared.broker import AI_ANALYSIS_QUEUE, ANALYTICS_QUEUE, VALIDATION_QUEUE
from shared.config import settings
from shared.schemas.analytics import (
    AnalyticsDashboard,
    ContentStats,
    UserStats,
    ValidationStats,
    AIAnalysisStats,
)
from repository import AnalyticsRepository

SERVICE_HEALTH_TARGETS = {
    "api-gateway": "http://api-gateway:8000/health",
    "auth-service": "http://auth-service:8001/health",
    "content-service": "http://content-service:8002/health",
    "validation-service": "http://validation-service:8003/health",
    "ai-service": "http://ai-service:8004/health",
    "analytics-service": "http://analytics-service:8005/health",
    "user-service": "http://user-service:8006/health",
    "transcription-service": "http://transcription-service:8007/health",
}

MONITORED_QUEUES = [VALIDATION_QUEUE, AI_ANALYSIS_QUEUE, ANALYTICS_QUEUE]


class AnalyticsService:
    """Analytics and metrics service."""

    def __init__(self, repo: AnalyticsRepository, cache=None):
        self.repo = repo
        self.cache = cache

    async def _get_or_set_cache(self, key: str, loader, ttl: int = 60):
        if self.cache:
            cached = await self.cache.get_json(key)
            if cached is not None:
                return cached
        value = await loader()
        if self.cache:
            if hasattr(value, "model_dump"):
                await self.cache.set_json(key, value.model_dump(), ttl=ttl)
            elif isinstance(value, dict):
                await self.cache.set_json(key, value, ttl=ttl)
        return value

    async def invalidate_cache(self) -> None:
        if self.cache:
            await self.cache.delete_pattern("analytics:*")

    async def get_dashboard(self) -> AnalyticsDashboard:
        """Get full dashboard analytics."""
        async def _load() -> AnalyticsDashboard:
            content = await self.get_content_stats()
            users = await self.get_user_stats()
            validation = await self.get_validation_stats()
            ai = await self.get_ai_stats()

            return AnalyticsDashboard(
                content=content,
                users=users,
                validation=validation,
                ai_analysis=ai,
            )

        result = await self._get_or_set_cache("analytics:dashboard", _load)
        return result if isinstance(result, AnalyticsDashboard) else AnalyticsDashboard(**result)

    async def get_content_stats(self) -> ContentStats:
        """Get content statistics."""
        result = await self._get_or_set_cache("analytics:content", self.repo.get_content_stats)
        return result if isinstance(result, ContentStats) else ContentStats(**result)

    async def get_user_stats(self) -> UserStats:
        """Get user statistics."""
        result = await self._get_or_set_cache("analytics:users", self.repo.get_user_stats)
        return result if isinstance(result, UserStats) else UserStats(**result)

    async def get_validation_stats(self) -> ValidationStats:
        """Get validation statistics."""
        result = await self._get_or_set_cache("analytics:validation", self.repo.get_validation_stats)
        return result if isinstance(result, ValidationStats) else ValidationStats(**result)

    async def get_ai_stats(self) -> AIAnalysisStats:
        """Get AI analysis statistics."""
        result = await self._get_or_set_cache("analytics:ai", self.repo.get_ai_stats)
        return result if isinstance(result, AIAnalysisStats) else AIAnalysisStats(**result)

    async def get_system_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        service_name: str | None = None,
        level: str | None = None,
    ) -> list[dict]:
        """Get system logs with filtering."""
        return await self.repo.get_system_logs(
            skip=skip, limit=limit, service_name=service_name, level=level
        )

    async def get_system_monitor(self) -> dict[str, Any]:
        """Get aggregated infrastructure and service monitor data."""
        services = await self._fetch_services_health()
        queues = await self._fetch_queue_status()
        redis_status = await self._fetch_redis_status()

        healthy_services = sum(
            1 for item in services if item["status"] == "healthy"
        )
        queue_backlog = sum(item.get("messages", 0) for item in queues)

        return {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "summary": {
                "healthy_services": healthy_services,
                "total_services": len(services),
                "queue_backlog": queue_backlog,
                "redis_status": redis_status.get("status", "unknown"),
            },
            "services": services,
            "queues": queues,
            "redis": redis_status,
        }

    async def _fetch_services_health(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=5.0) as client:
            checks = [
                self._check_service_health(client, name, url)
                for name, url in SERVICE_HEALTH_TARGETS.items()
            ]
            return list(await asyncio.gather(*checks))

    async def _check_service_health(
        self, client: httpx.AsyncClient, name: str, url: str
    ) -> dict[str, Any]:
        started_at = time.perf_counter()
        try:
            response = await client.get(url)
            payload = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            raw_status = payload.get("status")
            status = (
                "healthy"
                if response.is_success and raw_status in {None, "healthy"}
                else "degraded"
            )
            return {
                "name": name,
                "url": url,
                "status": status,
                "http_status": response.status_code,
                "response_time_ms": duration_ms,
                "details": payload,
            }
        except Exception as exc:
            return {
                "name": name,
                "url": url,
                "status": "offline",
                "http_status": None,
                "response_time_ms": None,
                "error": str(exc),
                "details": None,
            }

    async def _fetch_queue_status(self) -> list[dict[str, Any]]:
        base_url = (
            f"http://{settings.RABBITMQ_HOST}:{settings.RABBITMQ_MANAGEMENT_PORT}"
        )
        async with httpx.AsyncClient(
            timeout=5.0,
            auth=(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD),
        ) as client:
            checks = [
                self._check_queue(client, base_url, queue_name)
                for queue_name in MONITORED_QUEUES
            ]
            return list(await asyncio.gather(*checks))

    async def _check_queue(
        self, client: httpx.AsyncClient, base_url: str, queue_name: str
    ) -> dict[str, Any]:
        started_at = time.perf_counter()
        queue_path = queue_name.replace("/", "%2F")
        try:
            response = await client.get(f"{base_url}/api/queues/%2F/{queue_path}")
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            if response.status_code == 404:
                return {
                    "name": queue_name,
                    "status": "missing",
                    "messages": 0,
                    "messages_ready": 0,
                    "messages_unacknowledged": 0,
                    "consumers": 0,
                    "state": "not_created",
                    "response_time_ms": duration_ms,
                }

            response.raise_for_status()
            payload = response.json()
            return {
                "name": queue_name,
                "status": "healthy",
                "messages": payload.get("messages", 0),
                "messages_ready": payload.get("messages_ready", 0),
                "messages_unacknowledged": payload.get(
                    "messages_unacknowledged", 0
                ),
                "consumers": payload.get("consumers", 0),
                "state": payload.get("state", "unknown"),
                "response_time_ms": duration_ms,
            }
        except Exception as exc:
            return {
                "name": queue_name,
                "status": "offline",
                "messages": 0,
                "messages_ready": 0,
                "messages_unacknowledged": 0,
                "consumers": 0,
                "state": "unknown",
                "response_time_ms": None,
                "error": str(exc),
            }

    async def _fetch_redis_status(self) -> dict[str, Any]:
        if not self.cache or getattr(self.cache, "client", None) is None:
            return {
                "status": "disabled",
                "host": settings.REDIS_HOST,
                "db": settings.REDIS_DB,
                "connected": False,
                "latency_ms": None,
                "analytics_key_count": 0,
                "sample_keys": [],
            }

        started_at = time.perf_counter()
        try:
            ping_ok = await self.cache.client.ping()
            keys = await self.cache.client.keys("analytics:*")
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            return {
                "status": "healthy" if ping_ok else "degraded",
                "host": settings.REDIS_HOST,
                "db": settings.REDIS_DB,
                "connected": bool(ping_ok),
                "latency_ms": duration_ms,
                "analytics_key_count": len(keys),
                "sample_keys": keys[:5],
            }
        except Exception as exc:
            return {
                "status": "offline",
                "host": settings.REDIS_HOST,
                "db": settings.REDIS_DB,
                "connected": False,
                "latency_ms": None,
                "analytics_key_count": 0,
                "sample_keys": [],
                "error": str(exc),
            }
