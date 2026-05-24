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

from shared.config import settings

from middleware import AuthMiddleware, RateLimitMiddleware
from router import register_routes

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create HTTP client."""
    logger.info("API Gateway starting...")
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)


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
        "auth": "http://auth-service:8001/health",
        "content": "http://content-service:8002/health",
        "validation": "http://validation-service:8003/health",
        "ai-analysis": "http://ai-service:8004/health",
        "analytics": "http://analytics-service:8005/health",
        "user": "http://user-service:8006/health",
        "transcription": "http://transcription-service:8007/health",
    }

    results = {}
    for name, url in services.items():
        try:
            resp = await client.get(url, timeout=5.0)
            results[name] = {"status": "healthy", "code": resp.status_code}
        except Exception as e:
            results[name] = {"status": "unhealthy", "error": str(e)}

    return {"services": results}


# Register proxy routes
register_routes(app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
