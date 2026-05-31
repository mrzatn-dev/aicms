"""
API Gateway - Routes requests to microservices.
Runs on port 8000.
"""

import sys
import os
import logging
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from shared.config import as_http_url, settings
from shared.observability import ServiceObservabilityMiddleware

from middleware import AuthMiddleware, RateLimitMiddleware
from router import register_routes

# Mount auth-service routes directly (no separate service needed on Render)
from services.auth_service.main import app as auth_app

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create HTTP client."""
    logger.info("API Gateway starting...")
    logger.info(
        "Google OAuth on gateway: client_id=%s, client_secret=%s",
        "set" if settings.GOOGLE_CLIENT_ID else "MISSING",
        "set" if settings.GOOGLE_CLIENT_SECRET else "MISSING",
    )
    app.state.http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await app.state.http_client.aclose()
    logger.info("API Gateway shutting down...")


app = FastAPI(
    title="API Gateway",
    description="Central API Gateway for CMS Microservice Architecture",
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

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Require JWT for protected routes (added last = runs first in the stack)
app.add_middleware(AuthMiddleware)
app.add_middleware(ServiceObservabilityMiddleware, service_name="api-gateway")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        "%s %s → %d (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/services/health")
async def check_all_services(request: Request):
    """Check health of all downstream services."""
    client: httpx.AsyncClient = request.app.state.http_client
    services = {
        "auth": f"{as_http_url(settings.AUTH_SERVICE_URL)}/health",
        "content": f"{as_http_url(settings.CONTENT_SERVICE_URL)}/health",
        "validation": f"{as_http_url(settings.VALIDATION_SERVICE_URL)}/health",
        "ai-analysis": f"{as_http_url(settings.AI_SERVICE_URL)}/health",
        "analytics": f"{as_http_url(settings.ANALYTICS_SERVICE_URL)}/health",
        "user": f"{as_http_url(settings.USER_SERVICE_URL)}/health",
        "transcription": f"{as_http_url(settings.TRANSCRIPTION_SERVICE_URL)}/health",
    }

    results = {"auth": {"status": "healthy", "code": "mounted"}}
    for name, url in services.items():
        try:
            resp = await client.get(url, timeout=5.0)
            results[name] = {"status": "healthy", "code": resp.status_code}
        except Exception as e:
            results[name] = {"status": "unhealthy", "error": str(e)}

    return {"services": results}


# Mount auth-service directly
app.mount("/api/auth", auth_app)

# Register proxy routes for other services
register_routes(app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
