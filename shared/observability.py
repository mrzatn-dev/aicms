"""HTTP request observability via RabbitMQ analytics queue."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from shared.analytics_events import publish_analytics_event


class ServiceObservabilityMiddleware(BaseHTTPMiddleware):
    """Publish structured request logs to the analytics queue."""

    def __init__(self, app, service_name: str):
        super().__init__(app)
        self.service_name = service_name

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in {"/health", "/docs", "/openapi.json", "/redoc"}:
            return await call_next(request)

        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            await publish_analytics_event(
                service=self.service_name,
                event_type="http_error",
                level="error",
                message=f"{request.method} {request.url.path} failed",
                details={
                    "duration_ms": duration_ms,
                    "error": str(exc),
                },
            )
            raise

        duration_ms = int((time.perf_counter() - started) * 1000)
        level = "info"
        if response.status_code >= 500:
            level = "error"
        elif response.status_code >= 400:
            level = "warning"

        await publish_analytics_event(
            service=self.service_name,
            event_type="http_request",
            level=level,
            message=f"{request.method} {request.url.path} -> {response.status_code}",
            details={
                "duration_ms": duration_ms,
                "status_code": response.status_code,
                "method": request.method,
                "path": request.url.path,
            },
        )
        return response
