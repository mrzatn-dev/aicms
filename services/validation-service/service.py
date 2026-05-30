"""
Validation service business logic.
Extended validation pipeline with multiple rule categories.
"""

import re
import logging
from datetime import datetime, timezone
from collections import Counter

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from shared.schemas.validation import (
    ValidationRequest,
    ValidationResponse,
    ValidationError as VError,
    ValidationRule,
)
from shared.models.validation_log import ValidationLog
from shared.models.article import Article, ArticleStatus
from shared.config import as_http_url, settings
from shared.service_auth import internal_service_headers

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

FORBIDDEN_CHARS = re.compile(r'[<>{}\\]')
REPEATED_CHARS = re.compile(r'(.)\1{4,}')              # 5+ repeated chars
URL_PATTERN = re.compile(r'https?://\S+', re.IGNORECASE)
EXCESSIVE_WHITESPACE = re.compile(r'\n{4,}')            # 4+ newlines in a row
ONLY_DIGITS = re.compile(r'^\d+$')

MIN_TITLE_LENGTH = 5
MAX_TITLE_LENGTH = 500
MIN_CONTENT_LENGTH = 50
MAX_CONTENT_LENGTH = 100_000
MAX_TAGS_COUNT = 10
MAX_TAG_LENGTH = 50
MAX_URLS_IN_CONTENT = 10
MIN_UNIQUE_WORDS = 10
MIN_SENTENCES = 2
CAPS_RATIO_THRESHOLD = 0.7  # 70% uppercase = spam


# ─── Rules registry (for GET /validation/rules) ──────────────────────────────

VALIDATION_RULES: list[dict] = [
    # Structure rules
    {"code": "REQUIRED", "name": "Обязательное поле", "description": "Поле не должно быть пустым", "severity": "error", "category": "structure"},
    {"code": "MIN_LENGTH", "name": "Минимальная длина", "description": f"Title ≥ {MIN_TITLE_LENGTH}, Content ≥ {MIN_CONTENT_LENGTH} символов", "severity": "error", "category": "structure"},
    {"code": "MAX_LENGTH", "name": "Максимальная длина", "description": f"Title ≤ {MAX_TITLE_LENGTH}, Content ≤ {MAX_CONTENT_LENGTH} символов", "severity": "error", "category": "structure"},
    {"code": "FORBIDDEN_CHARS", "name": "Запрещённые символы", "description": "Символы < > { } \\ запрещены", "severity": "error", "category": "structure"},
    {"code": "TITLE_CAPITALIZATION", "name": "Заглавная буква", "description": "Заголовок должен начинаться с заглавной буквы", "severity": "warning", "category": "structure"},
    {"code": "TITLE_ONLY_DIGITS", "name": "Заголовок из цифр", "description": "Заголовок не может состоять только из цифр", "severity": "error", "category": "structure"},
    {"code": "MIN_SENTENCES", "name": "Минимум предложений", "description": f"Контент должен содержать минимум {MIN_SENTENCES} предложения", "severity": "warning", "category": "structure"},
    {"code": "EXCESSIVE_WHITESPACE", "name": "Лишние пробелы", "description": "Контент не должен содержать чрезмерные переносы строк", "severity": "warning", "category": "structure"},
    # Content rules
    {"code": "DUPLICATE_TITLE", "name": "Дубликат заголовка", "description": "Статья с таким заголовком уже существует", "severity": "error", "category": "content"},
    {"code": "LOW_UNIQUE_WORDS", "name": "Мало уникальных слов", "description": f"Контент должен содержать минимум {MIN_UNIQUE_WORDS} уникальных слов", "severity": "warning", "category": "content"},
    # Spam rules
    {"code": "REPEATED_CHARS", "name": "Повторяющиеся символы", "description": "Обнаружены повторяющиеся символы (aaaa, !!!!)", "severity": "warning", "category": "spam"},
    {"code": "CAPS_LOCK_ABUSE", "name": "Злоупотребление CapsLock", "description": f"Более {int(CAPS_RATIO_THRESHOLD * 100)}% текста в верхнем регистре", "severity": "warning", "category": "spam"},
    {"code": "EXCESSIVE_URLS", "name": "Много URL-ссылок", "description": f"Максимум {MAX_URLS_IN_CONTENT} URL-ссылок в контенте", "severity": "warning", "category": "spam"},
    # Metadata rules
    {"code": "MAX_TAGS", "name": "Слишком много тегов", "description": f"Максимум {MAX_TAGS_COUNT} тегов", "severity": "error", "category": "metadata"},
    {"code": "TAG_TOO_LONG", "name": "Тег слишком длинный", "description": f"Длина тега не более {MAX_TAG_LENGTH} символов", "severity": "error", "category": "metadata"},
    {"code": "TAG_INVALID_CHARS", "name": "Недопустимые символы в теге", "description": "Теги могут содержать только буквы, цифры, дефисы и пробелы", "severity": "error", "category": "metadata"},
]


class ValidationService:
    """Content validation service with extended rule pipeline."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ─── Main validation entry point ──────────────────────────────────────────

    async def validate_content(self, request: ValidationRequest) -> ValidationResponse:
        """Validate article content through all rule categories."""
        errors: list[VError] = []
        warnings: list[VError] = []
        score_penalties: float = 0.0

        # Run all validation categories
        self._validate_title_structure(request.title, errors, warnings)
        self._validate_content_structure(request.content, errors, warnings)
        self._validate_spam(request.title, request.content, warnings)
        self._validate_content_quality(request.content, warnings)
        self._validate_metadata(request.tags, errors)
        await self._check_duplicates(request.title, request.article_id, errors)
        await self._validate_ai(request.title, request.content, errors)

        # Calculate validation score
        score_penalties += len(errors) * 0.15
        score_penalties += len(warnings) * 0.05
        validation_score = max(0.0, min(1.0, 1.0 - score_penalties))

        is_valid = len(errors) == 0
        now = datetime.now(timezone.utc)

        # Save validation log
        log = ValidationLog(
            article_id=request.article_id,
            is_valid=is_valid,
            errors=[e.model_dump() for e in (errors + warnings)] if (errors or warnings) else None,
        )
        self.session.add(log)

        # Update article status
        from sqlalchemy import update
        new_status = ArticleStatus.ANALYZING if is_valid else ArticleStatus.REJECTED
        await self.session.execute(
            update(Article)
            .where(Article.id == request.article_id)
            .values(status=new_status)
        )

        await self.session.flush()

        logger.info(
            "Validation for article %s: valid=%s, errors=%d, warnings=%d, score=%.2f",
            request.article_id, is_valid, len(errors), len(warnings), validation_score,
        )

        return ValidationResponse(
            article_id=request.article_id,
            valid=is_valid,
            errors=errors,
            warnings=warnings,
            validation_score=round(validation_score, 2),
            validated_at=now,
        )

    # ─── Title structure rules ────────────────────────────────────────────────

    def _validate_title_structure(
        self, title: str, errors: list[VError], warnings: list[VError]
    ) -> None:
        if not title or not title.strip():
            errors.append(VError(field="title", message="Заголовок обязателен", code="REQUIRED"))
            return

        title = title.strip()

        if len(title) < MIN_TITLE_LENGTH:
            errors.append(VError(
                field="title",
                message=f"Заголовок должен быть минимум {MIN_TITLE_LENGTH} символов",
                code="MIN_LENGTH",
            ))

        if len(title) > MAX_TITLE_LENGTH:
            errors.append(VError(
                field="title",
                message=f"Заголовок не должен превышать {MAX_TITLE_LENGTH} символов",
                code="MAX_LENGTH",
            ))

        if FORBIDDEN_CHARS.search(title):
            errors.append(VError(
                field="title",
                message="Заголовок содержит запрещённые символы: < > { } \\",
                code="FORBIDDEN_CHARS",
            ))

        if ONLY_DIGITS.match(title):
            errors.append(VError(
                field="title",
                message="Заголовок не может состоять только из цифр",
                code="TITLE_ONLY_DIGITS",
            ))

        # Warnings
        if title and title[0].isalpha() and not title[0].isupper():
            warnings.append(VError(
                field="title",
                message="Рекомендуется начинать заголовок с заглавной буквы",
                code="TITLE_CAPITALIZATION",
                severity="warning",
            ))

    # ─── Content structure rules ──────────────────────────────────────────────

    def _validate_content_structure(
        self, content: str, errors: list[VError], warnings: list[VError]
    ) -> None:
        if not content or not content.strip():
            errors.append(VError(field="content", message="Контент обязателен", code="REQUIRED"))
            return

        content = content.strip()

        if len(content) < MIN_CONTENT_LENGTH:
            errors.append(VError(
                field="content",
                message=f"Контент должен быть минимум {MIN_CONTENT_LENGTH} символов",
                code="MIN_LENGTH",
            ))

        if len(content) > MAX_CONTENT_LENGTH:
            errors.append(VError(
                field="content",
                message=f"Контент не должен превышать {MAX_CONTENT_LENGTH} символов",
                code="MAX_LENGTH",
            ))

        if FORBIDDEN_CHARS.search(content):
            errors.append(VError(
                field="content",
                message="Контент содержит запрещённые символы: < > { } \\",
                code="FORBIDDEN_CHARS",
            ))

        # Sentence count check
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        if len(sentences) < MIN_SENTENCES:
            warnings.append(VError(
                field="content",
                message=f"Рекомендуется писать минимум {MIN_SENTENCES} предложения",
                code="MIN_SENTENCES",
                severity="warning",
            ))

        # Excessive whitespace
        if EXCESSIVE_WHITESPACE.search(content):
            warnings.append(VError(
                field="content",
                message="Обнаружены чрезмерные переносы строк",
                code="EXCESSIVE_WHITESPACE",
                severity="warning",
            ))

    # ─── Spam detection rules ─────────────────────────────────────────────────

    def _validate_spam(
        self, title: str, content: str, warnings: list[VError]
    ) -> None:
        full_text = f"{title} {content}"

        # Repeated characters
        if REPEATED_CHARS.search(full_text):
            warnings.append(VError(
                field="content",
                message="Обнаружены повторяющиеся символы (например: ааааа, !!!!!)",
                code="REPEATED_CHARS",
                severity="warning",
            ))

        # CapsLock abuse — check only alphabetic characters
        alpha_chars = [c for c in full_text if c.isalpha()]
        if len(alpha_chars) > 20:
            upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
            if upper_ratio > CAPS_RATIO_THRESHOLD:
                warnings.append(VError(
                    field="content",
                    message=f"Более {int(CAPS_RATIO_THRESHOLD * 100)}% текста написано в верхнем регистре",
                    code="CAPS_LOCK_ABUSE",
                    severity="warning",
                ))

        # Excessive URLs
        urls = URL_PATTERN.findall(content)
        if len(urls) > MAX_URLS_IN_CONTENT:
            warnings.append(VError(
                field="content",
                message=f"Обнаружено {len(urls)} URL-ссылок (максимум {MAX_URLS_IN_CONTENT})",
                code="EXCESSIVE_URLS",
                severity="warning",
            ))

    # ─── Content quality rules ────────────────────────────────────────────────

    def _validate_content_quality(
        self, content: str, warnings: list[VError]
    ) -> None:
        if not content:
            return

        # Unique words check
        words = re.findall(r'\b[a-zA-Zа-яА-ЯёЁ]{2,}\b', content.lower())
        unique_words = set(words)

        if len(unique_words) < MIN_UNIQUE_WORDS:
            warnings.append(VError(
                field="content",
                message=f"Контент содержит мало уникальных слов ({len(unique_words)}/{MIN_UNIQUE_WORDS})",
                code="LOW_UNIQUE_WORDS",
                severity="warning",
            ))

    # ─── Metadata rules ──────────────────────────────────────────────────────

    def _validate_metadata(
        self, tags: list[str] | None, errors: list[VError]
    ) -> None:
        if not tags:
            return

        if len(tags) > MAX_TAGS_COUNT:
            errors.append(VError(
                field="tags",
                message=f"Максимум {MAX_TAGS_COUNT} тегов (указано {len(tags)})",
                code="MAX_TAGS",
            ))

        tag_chars_pattern = re.compile(r'^[a-zA-Zа-яА-ЯёЁ0-9\s\-]+$')
        for tag in tags:
            if len(tag) > MAX_TAG_LENGTH:
                errors.append(VError(
                    field="tags",
                    message=f"Тег '{tag[:20]}...' слишком длинный (макс {MAX_TAG_LENGTH})",
                    code="TAG_TOO_LONG",
                ))
            if tag and not tag_chars_pattern.match(tag):
                errors.append(VError(
                    field="tags",
                    message=f"Тег '{tag[:20]}' содержит недопустимые символы",
                    code="TAG_INVALID_CHARS",
                ))

    # ─── Duplicate detection ──────────────────────────────────────────────────

    async def _check_duplicates(
        self, title: str, article_id, errors: list[VError]
    ) -> None:
        """Check if an article with the same title already exists."""
        if not title:
            return

        result = await self.session.execute(
            select(func.count())
            .select_from(Article)
            .where(
                Article.title == title.strip(),
                Article.id != article_id,
            )
        )
        count = result.scalar() or 0

        if count > 0:
            errors.append(VError(
                field="title",
                message="Статья с таким заголовком уже существует",
                code="DUPLICATE_TITLE",
            ))

    # ─── AI Validation ────────────────────────────────────────────────────────

    async def _validate_ai(self, title: str, content: str, errors: list[VError]) -> None:
        """Call internal AI service to evaluate context/spam intelligently."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{as_http_url(settings.AI_SERVICE_URL)}/validate-content",
                    json={"title": title, "content": content},
                    headers=internal_service_headers(),
                )
                if response.status_code == 200:
                    data = response.json()
                    is_valid = data.get("is_valid", True)
                    reason = data.get("reason", "Rejected by AI due to low quality.")
                    if not is_valid:
                        errors.append(VError(
                            field="content",
                            message=reason,
                            code="AI_REJECTED",
                        ))
                else:
                    logger.warning(f"AI validation returned non-200: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to communicate with AI service for validation: {e}")
            # Do not block publication if AI service is temporarily down
            pass

    # ─── Logs and rules ───────────────────────────────────────────────────────

    async def get_logs(self, skip: int = 0, limit: int = 50) -> list[dict]:
        """Get validation logs for admin dashboard."""
        result = await self.session.execute(
            select(ValidationLog)
            .order_by(ValidationLog.validated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        logs = result.scalars().all()
        return [
            {
                "id": str(log.id),
                "article_id": str(log.article_id),
                "is_valid": log.is_valid,
                "errors": log.errors,
                "validated_at": str(log.validated_at),
            }
            for log in logs
        ]

    @staticmethod
    def get_rules() -> list[dict]:
        """Return all registered validation rules."""
        return VALIDATION_RULES
