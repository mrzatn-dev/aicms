"""
AI analysis service business logic.
Uses lightweight NLP pipeline with spaCy-like analysis.
"""

import csv
import io
import uuid
import logging
import re
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.schemas.ai_analysis import AIAnalysisRequest, AIAnalysisResponse
from shared.models.ai_analysis import AIAnalysis
from shared.models.article import Article, ArticleStatus

from nlp_pipeline import NLPPipeline

logger = logging.getLogger(__name__)


class AIAnalysisService:
    """AI content analysis service."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.nlp = NLPPipeline()

    def _scan_file_security(
        self,
        filename: str,
        file_content: bytes,
        text_sample: str | None = None,
        content_flags: list[str] | None = None,
    ) -> dict:
        """Lightweight static file security scan + content admissibility verdict."""
        risk_flags: list[str] = []
        lowered_name = (filename or "").lower()
        ext = lowered_name.rsplit(".", 1)[-1] if "." in lowered_name else ""

        dangerous_extensions = {
            "exe", "dll", "bat", "cmd", "ps1", "sh", "jar", "msi", "scr", "com", "vbs"
        }
        if ext in dangerous_extensions:
            risk_flags.append(f"dangerous_extension:{ext}")

        header = file_content[:8192]
        executable_signatures = [
            (b"MZ", "windows_executable_signature"),
            (b"\x7fELF", "linux_elf_signature"),
            (b"\xcf\xfa\xed\xfe", "mach_o_signature"),
            (b"\xfe\xed\xfa\xcf", "mach_o_signature"),
        ]
        for signature, label in executable_signatures:
            if header.startswith(signature):
                risk_flags.append(label)

        lower_bytes = file_content[:16384].lower()
        suspicious_markers = [
            (b"<script", "embedded_script_marker"),
            (b"<?php", "php_code_marker"),
            (b"powershell", "powershell_marker"),
            (b"wscript.shell", "windows_script_host_marker"),
            (b"cmd.exe", "cmd_execution_marker"),
            (b"/bin/sh", "shell_execution_marker"),
        ]
        for marker, label in suspicious_markers:
            if marker in lower_bytes:
                risk_flags.append(label)

        if text_sample:
            lowered_text = text_sample.lower()
            if re.search(r"(?i)\b(eval\(|exec\(|base64_decode\()", lowered_text):
                risk_flags.append("dynamic_code_execution_pattern")

        content_flags = list(content_flags or [])
        is_malware_suspected = len(risk_flags) > 0
        is_content_allowed = len(content_flags) == 0
        is_safe = (not is_malware_suspected) and is_content_allowed

        if is_safe:
            verdict = "safe"
            summary = "Файл и контент выглядят допустимыми. Признаки вредоносности не обнаружены."
        elif is_malware_suspected:
            verdict = "blocked"
            summary = "Обнаружены подозрительные индикаторы файла. Рекомендуется отклонить или проверить вручную."
        else:
            verdict = "warning"
            summary = "Файл без явных вирусных признаков, но контент требует дополнительной проверки."

        return {
            "is_safe": is_safe,
            "is_content_allowed": is_content_allowed,
            "is_malware_suspected": is_malware_suspected,
            "verdict": verdict,
            "summary": summary,
            "risk_flags": list(dict.fromkeys([*risk_flags, *content_flags])),
            "scan_engine": "heuristic-static-v1",
        }

    async def analyze_content(self, request: AIAnalysisRequest) -> AIAnalysisResponse:
        """Perform full NLP analysis on article content."""
        # Run NLP pipeline
        result = await self.nlp.analyze(request.title, request.content)

        now = datetime.now(timezone.utc)

        # Check if analysis already exists
        existing = await self.session.execute(
            select(AIAnalysis).where(AIAnalysis.article_id == request.article_id)
        )
        analysis = existing.scalar_one_or_none()

        if analysis:
            # Update existing analysis
            await self.session.execute(
                update(AIAnalysis)
                .where(AIAnalysis.article_id == request.article_id)
                .values(
                    category=result["category"],
                    tags=result["tags"],
                    toxicity_score=result["toxicity_score"],
                    quality_score=result["quality_score"],
                    readability_score=result["readability_score"],
                    summary=result["summary"],
                    sentiment=result["sentiment"],
                    key_entities=result["key_entities"],
                    raw_result=result,
                    analyzed_at=now,
                )
            )
        else:
            # Create new analysis
            analysis = AIAnalysis(
                article_id=request.article_id,
                category=result["category"],
                tags=result["tags"],
                toxicity_score=result["toxicity_score"],
                quality_score=result["quality_score"],
                readability_score=result["readability_score"],
                summary=result["summary"],
                sentiment=result["sentiment"],
                key_entities=result["key_entities"],
                raw_result=result,
            )
            self.session.add(analysis)

        # Update article status to published and set AI-generated summary
        await self.session.execute(
            update(Article)
            .where(Article.id == request.article_id)
            .values(
                status=ArticleStatus.PUBLISHED,
                summary=result["summary"],
            )
        )

        await self.session.flush()

        logger.info(
            "Analysis complete for article %s: category=%s, quality=%.2f",
            request.article_id,
            result["category"],
            result["quality_score"],
        )

        return AIAnalysisResponse(
            article_id=request.article_id,
            category=result["category"],
            tags=result["tags"],
            toxicity_score=result["toxicity_score"],
            quality_score=result["quality_score"],
            readability_score=result["readability_score"],
            summary=result["summary"],
            sentiment=result["sentiment"],
            key_entities=result["key_entities"],
            analyzed_at=now,
        )

    async def get_analysis(self, article_id: uuid.UUID) -> AIAnalysisResponse:
        """Get analysis results for a specific article."""
        from fastapi import HTTPException, status

        result = await self.session.execute(
            select(AIAnalysis).where(AIAnalysis.article_id == article_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found for this article",
            )

        return AIAnalysisResponse(
            article_id=analysis.article_id,
            category=analysis.category,
            tags=analysis.tags or [],
            toxicity_score=analysis.toxicity_score or 0.0,
            quality_score=analysis.quality_score or 0.0,
            readability_score=analysis.readability_score or 0.0,
            summary=analysis.summary,
            sentiment=analysis.sentiment,
            key_entities=analysis.key_entities,
            analyzed_at=analysis.analyzed_at,
        )

    async def list_analyses(
        self, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        """List all analyses for admin dashboard."""
        result = await self.session.execute(
            select(AIAnalysis)
            .order_by(AIAnalysis.analyzed_at.desc())
            .offset(skip)
            .limit(limit)
        )
        analyses = result.scalars().all()
        return [
            {
                "id": str(a.id),
                "article_id": str(a.article_id),
                "category": a.category,
                "tags": a.tags,
                "toxicity_score": a.toxicity_score,
                "quality_score": a.quality_score,
                "readability_score": a.readability_score,
                "summary": a.summary,
                "sentiment": a.sentiment,
                "key_entities": a.key_entities,
                "analyzed_at": str(a.analyzed_at),
            }
            for a in analyses
        ]

    async def generate_draft(self, request_data: dict) -> dict:
        """Call NLP pipeline to generate draft."""
        return await self.nlp.generate_draft(
            topic=request_data["topic"], 
            tone=request_data.get("tone", "professional")
        )

    async def generate_seo(self, request_data: dict) -> dict:
        """Call NLP pipeline to generate SEO metadata."""
        return await self.nlp.generate_seo(content=request_data["content"])

    async def chat(
        self,
        message: str,
        history: list[dict] | None = None,
        language: str = "ru",
    ) -> dict:
        """Handle AI chat conversation."""
        return await self.nlp.chat(message=message, history=history, language=language)

    async def validate_user_input(self, title: str, content: str, language: str = "ru") -> dict:
        """Perform AI smart validation."""
        return await self.nlp.validate_user_input(title, content, language=language)

    async def analyze_csv(self, file_content: bytes, filename: str, language: str = "ru") -> dict:
        """Parse and analyze a CSV file with validation checks + AI analysis."""
        from fastapi import HTTPException

        warnings: list[str] = []
        content_flags: list[str] = []

        # ── 1. Encoding detection ──────────────────────────────────────
        try:
            text = file_content.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                text = file_content.decode("latin-1")
                warnings.append("Файл не в UTF-8, использована кодировка latin-1")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Не удалось определить кодировку файла. Используйте UTF-8",
                )

        # ── 2. CSV parse ───────────────────────────────────────────────
        try:
            reader = csv.DictReader(io.StringIO(text))
            columns = reader.fieldnames or []
        except csv.Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка парсинга CSV: {str(e)}",
            )

        # ── 3. Column checks ──────────────────────────────────────────
        if not columns:
            raise HTTPException(
                status_code=400,
                detail="CSV-файл не содержит заголовков колонок",
            )

        # Duplicate column names
        seen = set()
        duplicates = []
        for col in columns:
            if col in seen:
                duplicates.append(col)
            seen.add(col)
        if duplicates:
            warnings.append(
                f"Обнаружены дублирующиеся колонки: {', '.join(duplicates)}"
            )

        # ── 4. Read rows with limit ───────────────────────────────────
        MAX_ROWS = 100_000
        rows = []
        try:
            for row in reader:
                rows.append(dict(row))
                if len(rows) >= MAX_ROWS:
                    warnings.append(
                        f"Файл содержит более {MAX_ROWS:,} строк, анализ выполнен по первым {MAX_ROWS:,}"
                    )
                    break
        except csv.Error as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при чтении строк CSV: {str(e)}",
            )

        total_rows = len(rows)

        # ── 5. Empty data check ───────────────────────────────────────
        if total_rows == 0:
            raise HTTPException(
                status_code=400,
                detail="CSV-файл содержит заголовки, но не содержит данных",
            )

        # ── 6. Missing values analysis ────────────────────────────────
        missing_values: dict[str, int] = {}
        for col in columns:
            empty_count = sum(
                1 for row in rows
                if not row.get(col) or str(row.get(col, "")).strip() == ""
            )
            if empty_count > 0:
                missing_values[col] = empty_count

        if missing_values:
            total_cells = total_rows * len(columns)
            total_missing = sum(missing_values.values())
            pct = (total_missing / total_cells) * 100
            warnings.append(
                f"Обнаружено {total_missing:,} пустых значений ({pct:.1f}% от всех ячеек)"
            )

        # ── 7. Empty columns check ────────────────────────────────────
        empty_columns = [col for col, cnt in missing_values.items() if cnt == total_rows]
        if empty_columns:
            warnings.append(
                f"Полностью пустые колонки: {', '.join(empty_columns)}"
            )

        # ── 8. AI analysis ────────────────────────────────────────────
        sample_rows = rows[:50]

        sampled_values = " ".join(
            str(v) for row in sample_rows for v in row.values() if v is not None
        )[:5000]
        if re.search(r"(?i)\b(password|passwd|пароль|api[_-]?key|token)\b", sampled_values):
            warnings.append("В таблице могут присутствовать чувствительные данные (пароли/ключи/токены)")
            content_flags.append("possible_sensitive_data")
        if re.search(r"(?i)\b(cvv|card number|номер карты|seed phrase)\b", sampled_values):
            warnings.append("Обнаружены признаки платёжных или крипто-реквизитов")
            content_flags.append("possible_financial_or_wallet_data")

        ai_result = await self.nlp.analyze_csv(
            columns=list(columns),
            sample_rows=sample_rows,
            total_rows=total_rows,
            filename=filename,
            language=language,
        )

        # Merge local warnings into anomalies
        all_anomalies = list(warnings) + ai_result.get("anomalies", [])
        security_verdict = self._scan_file_security(
            filename=filename,
            file_content=file_content,
            text_sample=text[:5000],
            content_flags=content_flags,
        )

        return {
            "filename": filename,
            "total_rows": total_rows,
            "total_columns": len(columns),
            "columns": list(columns),
            "summary": ai_result.get("summary", ""),
            "data_quality": ai_result.get("data_quality", {}),
            "anomalies": all_anomalies,
            "recommendations": ai_result.get("recommendations", []),
            "warnings": warnings,
            "missing_values": missing_values,
            "security_verdict": security_verdict,
        }

    async def analyze_image(self, file_content: bytes, filename: str, language: str = "ru") -> dict:
        """Analyze an image with Pillow local checks + DeepSeek AI."""
        from fastapi import HTTPException
        from PIL import Image, ExifTags, UnidentifiedImageError

        warnings: list[str] = []
        file_size_kb = len(file_content) / 1024

        # ── 1. Try opening image ──────────────────────────────────────
        try:
            img = Image.open(io.BytesIO(file_content))
            img.verify()  # Check corruption
            # Re-open after verify (verify closes the image)
            img = Image.open(io.BytesIO(file_content))
        except UnidentifiedImageError:
            raise HTTPException(
                status_code=400,
                detail="Файл не является изображением или повреждён",
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка при чтении изображения: {str(e)[:100]}",
            )

        # ── 2. Format check ───────────────────────────────────────────
        img_format = img.format or "Unknown"
        allowed_formats = {"JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF"}
        if img_format.upper() not in allowed_formats:
            warnings.append(
                f"Необычный формат изображения: {img_format}. "
                f"Рекомендуется: {', '.join(sorted(allowed_formats))}"
            )

        width, height = img.size
        color_mode = img.mode

        # ── 3. Dimension checks ───────────────────────────────────────
        if width < 50 or height < 50:
            warnings.append(
                f"Слишком маленькое изображение ({width}×{height}). "
                f"Минимум 50×50 px для обложки"
            )

        if width > 10000 or height > 10000:
            warnings.append(
                f"Очень большое разрешение ({width}×{height}). "
                f"Рекомендуется уменьшить до 4000×4000 px"
            )

        # Aspect ratio check
        if width > 0 and height > 0:
            ratio = max(width, height) / min(width, height)
            if ratio > 5:
                warnings.append(
                    f"Нестандартное соотношение сторон ({width}:{height}, "
                    f"ratio={ratio:.1f}). Возможно это баннер или полоска"
                )

        # ── 4. File size checks ───────────────────────────────────────
        if file_size_kb > 5000:
            warnings.append(
                f"Большой размер файла ({file_size_kb:.0f} KB). "
                f"Рекомендуется сжать до 2-3 MB"
            )
        elif file_size_kb < 1:
            warnings.append("Подозрительно маленький файл (<1 KB)")

        # ── 5. Color mode checks ──────────────────────────────────────
        if color_mode == "CMYK":
            warnings.append(
                "Цветовое пространство CMYK (для печати). "
                "Для веб необходимо конвертировать в RGB"
            )
        elif color_mode == "P":
            warnings.append("Палитровое изображение. Может иметь ограниченные цвета")
        elif color_mode == "L":
            warnings.append("Чёрно-белое изображение (grayscale)")

        # ── 6. EXIF metadata extraction ───────────────────────────────
        exif_data: dict[str, str] = {}
        has_exif = False
        try:
            raw_exif = img.getexif()
            if raw_exif:
                has_exif = True
                exif_tags_map = {
                    ExifTags.Base.Make: "camera_make",
                    ExifTags.Base.Model: "camera_model",
                    ExifTags.Base.DateTime: "date_time",
                    ExifTags.Base.Software: "software",
                    ExifTags.Base.ImageWidth: "exif_width",
                    ExifTags.Base.ImageLength: "exif_height",
                    ExifTags.Base.Orientation: "orientation",
                }
                for tag_id, key in exif_tags_map.items():
                    val = raw_exif.get(tag_id)
                    if val is not None:
                        exif_data[key] = str(val)

                # GPS check
                gps_ifd = raw_exif.get_ifd(ExifTags.IFD.GPSInfo)
                if gps_ifd:
                    exif_data["has_gps"] = "true"
                    warnings.append(
                        "Изображение содержит GPS-координаты. "
                        "Рекомендуется удалить для приватности"
                    )
        except Exception:
            pass  # EXIF extraction is optional

        # ── 7. AI analysis ────────────────────────────────────────────
        metadata = {
            "filename": filename,
            "format": img_format,
            "width": width,
            "height": height,
            "file_size_kb": file_size_kb,
            "color_mode": color_mode,
            "has_exif": has_exif,
            "exif_data": exif_data,
            "warnings": warnings,
        }

        ai_result = await self.nlp.analyze_image_metadata(metadata, language=language)
        content_flags: list[str] = []
        if not ai_result.get("is_suitable", True):
            content_flags.append("not_suitable_for_publication")
        security_verdict = self._scan_file_security(
            filename=filename,
            file_content=file_content,
            content_flags=content_flags,
        )

        return {
            "filename": filename,
            "format": img_format,
            "width": width,
            "height": height,
            "file_size_kb": round(file_size_kb, 1),
            "color_mode": color_mode,
            "has_exif": has_exif,
            "exif_data": exif_data,
            "warnings": warnings,
            "ai_summary": ai_result.get("ai_summary", ""),
            "ai_recommendations": ai_result.get("ai_recommendations", []),
            "is_suitable": ai_result.get("is_suitable", True),
            "security_verdict": security_verdict,
        }

    async def analyze_document(
        self,
        file_content: bytes,
        filename: str,
        file_type: str,
        language: str = "ru",
    ) -> dict:
        """Analyze a text document (PDF, TXT, DOCX) with AI."""
        from fastapi import HTTPException

        warnings: list[str] = []
        content_flags: list[str] = []
        text_content = ""

        # Extract text based on file type
        if file_type == ".txt":
            try:
                text_content = file_content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    text_content = file_content.decode("latin-1")
                    warnings.append("Файл не в UTF-8, использована кодировка latin-1")
                except UnicodeDecodeError:
                    raise HTTPException(
                        status_code=400,
                        detail="Не удалось определить кодировку файла. Используйте UTF-8",
                    )
        elif file_type == ".pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_content))
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
                if not text_content.strip():
                    warnings.append("PDF содержит только изображения или сканированный текст (OCR не поддерживается)")
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="PDF analysis requires pypdf. Install with: pip install pypdf",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ошибка чтения PDF: {str(e)[:100]}",
                )
        elif file_type == ".docx":
            try:
                from docx import Document
                doc = Document(io.BytesIO(file_content))
                for para in doc.paragraphs:
                    text_content += para.text + "\n"
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="DOCX analysis requires python-docx. Install with: pip install python-docx",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ошибка чтения DOCX: {str(e)[:100]}",
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Неподдерживаемый формат: {file_type}",
            )

        # Basic text analysis
        file_size_kb = len(file_content) / 1024
        text_length = len(text_content)
        word_count = len(text_content.split())
        line_count = len(text_content.splitlines())

        # Content checks
        if text_length == 0:
            raise HTTPException(
                status_code=400,
                detail="Документ не содержит извлекаемого текста",
            )

        if text_length < 50:
            warnings.append("Документ очень короткий (менее 50 символов)")

        if word_count < 10:
            warnings.append("Документ содержит менее 10 слов")

        # Check for suspicious patterns
        suspicious_patterns = [
            (
                r"(?i)(password|пароль|passwd)\s*[=:]\s*\S+",
                "Возможно обнаружен пароль в тексте",
                "possible_password_exposure",
            ),
            (
                r"(?i)(api[_-]?key|apikey|токен)\s*[=:]\s*\S+",
                "Возможно обнаружен API ключ",
                "possible_api_key_exposure",
            ),
            (
                r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
                "Обнаружен номер, похожий на банковскую карту",
                "possible_card_number",
            ),
        ]

        for pattern, warning_msg, flag in suspicious_patterns:
            if re.search(pattern, text_content):
                warnings.append(warning_msg)
                content_flags.append(flag)

        # AI analysis - use first 3000 chars
        sample_text = text_content[:3000]

        ai_result = await self.nlp.analyze_document(
            filename=filename,
            content_sample=sample_text,
            word_count=word_count,
            line_count=line_count,
            file_size_kb=file_size_kb,
            language=language,
        )
        security_verdict = self._scan_file_security(
            filename=filename,
            file_content=file_content,
            text_sample=text_content[:5000],
            content_flags=content_flags,
        )

        return {
            "filename": filename,
            "file_type": file_type,
            "file_size_kb": round(file_size_kb, 1),
            "text_length": text_length,
            "word_count": word_count,
            "line_count": line_count,
            "warnings": warnings,
            "ai_summary": ai_result.get("summary", ""),
            "ai_recommendations": ai_result.get("recommendations", []),
            "content_category": ai_result.get("category", "unknown"),
            "quality_score": ai_result.get("quality_score", 0),
            "language": ai_result.get("language", "unknown"),
            "security_verdict": security_verdict,
        }
