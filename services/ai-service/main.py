"""
AI Analysis Service - NLP content analysis via REST and RabbitMQ.
Runs on port 8004.
"""

import sys
import os
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, init_db, async_session_factory
from shared.schemas.ai_analysis import (
    AIAnalysisRequest, 
    AIAnalysisResponse,
    AIDraftRequest,
    AIDraftResponse,
    AISEORequest,
    AISEOResponse,
    AIChatRequest,
    AIChatResponse,
    AIValidationRequest,
    AIValidationResponse,
    CSVAnalysisResponse,
    ImageAnalysisResponse,
)
from shared.broker import broker, AI_ANALYSIS_QUEUE
from shared.auth import require_admin

from service import AIAnalysisService

logger = logging.getLogger(__name__)


async def handle_analysis_message(message: dict) -> None:
    """Handle incoming AI analysis requests from RabbitMQ."""
    logger.info("Received AI analysis request for article: %s", message.get("article_id"))
    async with async_session_factory() as session:
        try:
            ai_service = AIAnalysisService(session)
            request = AIAnalysisRequest(
                article_id=message["article_id"],
                title=message["title"],
                content=message["content"],
            )
            await ai_service.analyze_content(request)
            await session.commit()
            logger.info("AI analysis completed for article %s", message["article_id"])
        except Exception as e:
            await session.rollback()
            logger.error("AI analysis error: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    logger.info("AI Analysis Service starting...")
    await init_db()
    try:
        await broker.connect()
        await broker.consume(AI_ANALYSIS_QUEUE, handle_analysis_message)
        logger.info("Consuming from AI analysis queue")
    except Exception as e:
        logger.warning("Could not connect to RabbitMQ: %s", e)
    yield
    await broker.disconnect()
    logger.info("AI Analysis Service shutting down...")


app = FastAPI(
    title="AI Analysis Service",
    description="NLP analysis: classification, tags, toxicity, summary, readability",
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


def get_ai_service(
    session: AsyncSession = Depends(get_session),
) -> AIAnalysisService:
    return AIAnalysisService(session)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


@app.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_content(
    request: AIAnalysisRequest,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze content via REST endpoint."""
    return await service.analyze_content(request)


@app.get("/analysis/{article_id}", response_model=AIAnalysisResponse)
async def get_analysis(
    article_id: str,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Get analysis results for an article."""
    from uuid import UUID
    return await service.get_analysis(UUID(article_id))


@app.get("/analyses")
async def list_analyses(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """List all AI analyses (admin only)."""
    return await service.list_analyses(skip=skip, limit=limit)


@app.post("/generate/draft", response_model=AIDraftResponse)
async def generate_draft(
    request: AIDraftRequest,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Generate article draft via DeepSeek."""
    return await service.generate_draft(request.model_dump())


@app.post("/generate/seo", response_model=AISEOResponse)
async def generate_seo(
    request: AISEORequest,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Generate SEO metadata via DeepSeek."""
    return await service.generate_seo(request.model_dump())


@app.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    request: AIChatRequest,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """AI chat assistant for CMS help."""
    history = [msg.model_dump() for msg in request.history] if request.history else None
    return await service.chat(message=request.message, history=history, language=request.language)


@app.post("/validate-content", response_model=AIValidationResponse)
async def ai_validate_content(
    request: AIValidationRequest,
    service: AIAnalysisService = Depends(get_ai_service),
):
    """AI smart validation for Article content."""
    return await service.validate_user_input(
        title=request.title,
        content=request.content,
        language=request.language,
    )


@app.post("/analyze/csv", response_model=CSVAnalysisResponse)
async def analyze_csv(
    request: Request,
    file: UploadFile = File(...),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded CSV file using AI."""
    # Check file extension
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Принимаются только CSV-файлы")

    content = await file.read()

    # Check empty file
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Check file size (max 10 MB)
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 10 MB",
        )

    result = await service.analyze_csv(
        file_content=content,
        filename=file.filename,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return CSVAnalysisResponse(**result)


@app.post("/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded image using Pillow + AI."""
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {', '.join(sorted(allowed_ext))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Max 15 MB
    max_size = 15 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 15 MB",
        )

    result = await service.analyze_image(
        file_content=content,
        filename=file.filename,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return ImageAnalysisResponse(**result)


@app.post("/analyze/document")
async def analyze_document(
    request: Request,
    file: UploadFile = File(...),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded document (PDF, TXT, DOCX) using AI."""
    allowed_ext = {".txt", ".pdf", ".docx"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {', '.join(sorted(allowed_ext))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Max 20 MB
    max_size = 20 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 20 MB",
        )

    result = await service.analyze_document(
        file_content=content,
        filename=file.filename or "unknown",
        file_type=ext,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
