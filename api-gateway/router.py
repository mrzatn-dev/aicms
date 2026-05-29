"""
API Gateway router - proxies requests to backend services.
"""

import logging

import httpx
from fastapi import FastAPI, Request, Response, HTTPException

from shared.config import as_http_url, settings

logger = logging.getLogger(__name__)

# Service URL mapping
SERVICE_MAP = {
    "auth": as_http_url(settings.AUTH_SERVICE_URL),
    "content": as_http_url(settings.CONTENT_SERVICE_URL),
    "validation": as_http_url(settings.VALIDATION_SERVICE_URL),
    "ai": as_http_url(settings.AI_SERVICE_URL),
    "analytics": as_http_url(settings.ANALYTICS_SERVICE_URL),
    "user": as_http_url(settings.USER_SERVICE_URL),
    "transcription": as_http_url(settings.TRANSCRIPTION_SERVICE_URL),
}


async def proxy_request(
    request: Request,
    service_url: str,
    path: str,
) -> Response:
    """Forward request to a backend service."""
    client: httpx.AsyncClient = request.app.state.http_client

    # Build target URL
    url = f"{service_url}{path}"
    if request.query_params:
        url += f"?{request.query_params}"

    # Forward headers; preserve public host for OAuth redirect_uri behind the gateway
    headers = dict(request.headers)
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    if forwarded_host:
        headers["x-forwarded-host"] = forwarded_host
        headers["x-forwarded-proto"] = forwarded_proto
    headers.pop("host", None)

    # Read body if present
    body = await request.body()

    try:
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body if body else None,
            timeout=30.0,
        )

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type"),
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Service unavailable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Service timeout")
    except Exception as e:
        logger.error("Proxy error: %s", e)
        raise HTTPException(status_code=502, detail="Bad gateway")


def register_routes(app: FastAPI) -> None:
    """Register all proxy routes for downstream services."""

    # ─── Content Service routes ──────────────────────────────────────
    @app.api_route("/api/content/my", methods=["GET"])
    async def content_my_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["content"], "/content/my")

    @app.api_route("/api/content/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def content_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["content"], f"/content/{path}")

    @app.api_route("/api/content", methods=["GET", "POST"])
    async def content_root_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["content"], "/content")

    @app.api_route("/api/categories", methods=["GET"])
    async def categories_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["content"], "/categories")

    @app.api_route("/api/tags", methods=["GET"])
    async def tags_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["content"], "/tags")

    # ─── Validation Service routes ───────────────────────────────────
    @app.api_route("/api/validation/{path:path}", methods=["GET", "POST"])
    async def validation_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["validation"], f"/{path}")

    # ─── AI Service routes ───────────────────────────────────────────
    @app.api_route("/api/ai/chat", methods=["POST"])
    async def ai_chat_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["ai"], "/chat")

    @app.api_route("/api/ai/{path:path}", methods=["GET", "POST"])
    async def ai_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["ai"], f"/{path}")

    # ─── Analytics Service routes ────────────────────────────────────
    @app.api_route("/api/analytics/{path:path}", methods=["GET"])
    async def analytics_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["analytics"], f"/{path}")

    @app.api_route("/api/analytics", methods=["GET"])
    async def analytics_root_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["analytics"], "/dashboard")

    # ─── User Service routes ─────────────────────────────────────────
    @app.api_route("/api/user/history", methods=["GET", "POST"])
    async def user_history_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/history")

    @app.api_route("/api/user/history/{path:path}", methods=["GET", "DELETE"])
    async def user_history_detail_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["user"], f"/history/{path}")

    @app.api_route("/api/user/settings", methods=["GET", "PUT"])
    async def user_settings_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/settings")

    @app.api_route("/api/user/statistics", methods=["GET"])
    async def user_statistics_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/statistics")

    @app.api_route("/api/user/support/conversations", methods=["GET", "POST"])
    async def user_support_conversations_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/support/conversations")

    @app.api_route("/api/user/support/conversations/{path:path}", methods=["GET", "POST"])
    async def user_support_conversation_detail_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["user"], f"/support/conversations/{path}")

    @app.api_route("/api/admin/support/conversations", methods=["GET"])
    async def admin_support_conversations_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/admin/support/conversations")

    @app.api_route("/api/admin/support/conversations/{path:path}", methods=["GET", "POST", "PUT"])
    async def admin_support_conversation_detail_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["user"], f"/admin/support/conversations/{path}")

    @app.api_route("/api/admin/overview", methods=["GET"])
    async def admin_overview_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/admin/overview")

    @app.api_route("/api/admin/users", methods=["GET"])
    async def admin_users_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/admin/users")

    @app.api_route("/api/admin/files", methods=["GET"])
    async def admin_files_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["user"], "/admin/files")

    # ─── Transcription Service routes ─────────────────────────────────────
    @app.api_route("/api/transcription/transcribe", methods=["POST"])
    async def transcribe_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["transcription"], "/transcribe")

    @app.api_route("/api/transcription/transcriptions", methods=["GET"])
    async def transcriptions_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["transcription"], "/transcriptions")

    @app.api_route("/api/transcription/transcriptions/{path:path}", methods=["GET", "PUT", "DELETE"])
    async def transcription_detail_proxy(request: Request, path: str):
        return await proxy_request(request, SERVICE_MAP["transcription"], f"/transcriptions/{path}")

    @app.api_route("/api/transcription/transcriptions/stats", methods=["GET"])
    async def transcription_stats_proxy(request: Request):
        return await proxy_request(request, SERVICE_MAP["transcription"], "/transcriptions/stats")
