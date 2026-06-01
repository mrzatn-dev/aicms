"""
Validation Service - Content validation via REST and RabbitMQ.
Runs on port 8003.
"""

import sys
import os
import json
import logging
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, async_session_factory
from shared.schemas.validation import ValidationRequest, ValidationResponse, ValidationRule
from shared.broker import broker, VALIDATION_QUEUE, AI_ANALYSIS_QUEUE
from shared.auth import require_admin, get_current_user
from shared.subscription_deps import require_ai_quota
from shared.service_auth import add_service_auth_middleware
from shared.observability import ServiceObservabilityMiddleware

from service import ValidationService

logger = logging.getLogger(__name__)


async def handle_validation_message(message: dict) -> None:
    """Handle incoming validation requests from RabbitMQ."""
    logger.info("Received validation request for article: %s", message.get("article_id"))
    async with async_session_factory() as session:
        try:
            validation_service = ValidationService(session)
            request = ValidationRequest(
                article_id=message["article_id"],
                title=message["title"],
                content=message["content"],
                tags=message.get("tags"),
            )
            result = await validation_service.validate_content(request)

            # If valid, send to AI analysis queue
            if result.valid:
                try:
                    await broker.publish(
                        AI_ANALYSIS_QUEUE,
                        {
                            "article_id": str(result.article_id),
                            "title": message["title"],
                            "content": message["content"],
                        },
                    )
                    logger.info("Sent article %s to AI analysis", result.article_id)
                except Exception as e:
                    logger.warning("Failed to send to AI queue: %s", e)

            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Validation error: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    logger.info("Validation Service starting...")
    try:
        await broker.connect()
        await broker.consume(VALIDATION_QUEUE, handle_validation_message)
        logger.info("Consuming from validation queue")
    except Exception as e:
        logger.warning("Could not connect to RabbitMQ: %s", e)
    yield
    await broker.disconnect()
    logger.info("Validation Service shutting down...")


app = FastAPI(
    title="Validation Service",
    description="Content validation with field checking and schema validation",
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
app.add_middleware(ServiceObservabilityMiddleware, service_name="validation-service")


def get_validation_service(
    session: AsyncSession = Depends(get_session),
) -> ValidationService:
    return ValidationService(session)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "validation-service"}


@app.post("/validate", response_model=ValidationResponse)
async def validate_content(
    request: ValidationRequest,
    current_user: dict = Depends(require_ai_quota),
    service: ValidationService = Depends(get_validation_service),
):
    """Validate content via REST endpoint."""
    return await service.validate_content(request)


@app.get("/validation-logs")
async def get_validation_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    service: ValidationService = Depends(get_validation_service),
):
    """Get validation logs (admin only)."""
    return await service.get_logs(skip=skip, limit=limit)


@app.get("/rules", response_model=list[ValidationRule])
async def get_validation_rules(
    current_user: dict = Depends(get_current_user),
):
    """Get all registered validation rules."""
    return ValidationService.get_rules()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
