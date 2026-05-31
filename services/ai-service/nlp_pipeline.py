"""
NLP Pipeline - Text analysis using DeepSeek API (OpenAI-compatible).
"""

import json
import logging
import re
from typing import AsyncIterator
from openai import AsyncOpenAI, APIStatusError
from pydantic import BaseModel, Field

from shared.config import settings

logger = logging.getLogger(__name__)

# Configure DeepSeek client via OpenAI SDK
_client: AsyncOpenAI | None = None

if settings.DEEPSEEK_API_KEY:
    _client = AsyncOpenAI(
        api_key=settings.DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
    )
else:
    logger.warning("DEEPSEEK_API_KEY not set. DeepSeek integration will not work.")

MODEL_NAME = "deepseek-chat"

_RE_WORD = re.compile(r"[a-zA-Zа-яА-ЯёЁ0-9_]+", re.UNICODE)


class AIAnalysisResult(BaseModel):
    category: str = Field(description="The main category of the article (e.g., Programming, Data Science, Business, General)")
    tags: list[str] = Field(description="List of 3-8 relevant SEO-friendly tags")
    toxicity_score: float = Field(description="Score between 0.0 and 1.0 indicating how toxic or offensive the text is (0.0 is completely clean, 1.0 is highly toxic)")
    quality_score: float = Field(description="Score between 0.0 and 1.0 indicating the overall quality and depth of the article (0.1 is terrible, 1.0 is masterful)")
    readability_score: float = Field(description="Score between 0.0 and 1.0 indicating how easy it is to read (0.1 is unreadable, 1.0 is very easy to read)")
    summary: str = Field(description="A concise summary of the article in 2-3 sentences")
    sentiment: str = Field(description="The tone/sentiment of the article: 'Positive', 'Negative', or 'Neutral'")
    key_entities: dict[str, list[str]] = Field(description="A dictionary extracting key entities: 'people', 'organizations', 'locations', 'topics'")


class NLPPipeline:
    """DeepSeek-powered NLP analysis pipeline."""

    def __init__(self):
        self.client = _client

    async def _chat(self, messages: list[dict], response_format: dict | None = None) -> str:
        """Send a chat completion request to DeepSeek and return response text."""
        kwargs: dict = {
            "model": MODEL_NAME,
            "messages": messages,
            "temperature": 0.3,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    async def analyze(self, title: str, content: str) -> dict:
        """Run full analysis pipeline on text using DeepSeek."""
        if not self.client:
            logger.error("No DeepSeek API key available. Returning fallback mock data.")
            return {
                "category": "General",
                "tags": ["no-ai", "fallback"],
                "toxicity_score": 0.0,
                "quality_score": 0.5,
                "readability_score": 0.5,
                "summary": content[:200] + ("..." if len(content) > 200 else ""),
                "sentiment": "Neutral",
                "key_entities": {"people": [], "organizations": [], "locations": [], "topics": []},
            }

        messages = [
            {
                "role": "system",
                "content": "You are an expert content analyst. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following article and extract metadata.\n\n"
                    f"Title: {title}\n\n"
                    f"Content:\n{content[:15000]}\n\n"
                    f"Return ONLY a JSON object that strictly adheres to this JSON schema:\n"
                    f"{json.dumps(AIAnalysisResult.model_json_schema(), ensure_ascii=False)}"
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result_dict = json.loads(raw)

            # Validate with Pydantic
            validated = AIAnalysisResult(**result_dict)

            return {
                "category": validated.category,
                "tags": validated.tags,
                "toxicity_score": round(validated.toxicity_score, 4),
                "quality_score": round(validated.quality_score, 4),
                "readability_score": round(validated.readability_score, 4),
                "summary": validated.summary,
                "sentiment": validated.sentiment,
                "key_entities": validated.key_entities,
            }
        except APIStatusError as e:
            msg = "Недостаточно средств на балансе API (402)." if e.status_code == 402 else f"Ошибка API: {e}"
            logger.error("DeepSeek API Error: %s", msg)
            return {
                "category": "Error",
                "tags": ["error", "api-failed"],
                "toxicity_score": 0.0,
                "quality_score": 0.0,
                "readability_score": 0.0,
                "summary": msg,
                "sentiment": "Unknown",
                "key_entities": {},
            }
        except Exception as e:
            logger.exception("Error during DeepSeek analysis: %s", str(e))
            return {
                "category": "Error",
                "tags": ["error", "analysis-failed"],
                "toxicity_score": 0.0,
                "quality_score": 0.0,
                "readability_score": 0.0,
                "summary": f"Failed to analyze content using AI: {str(e)[:100]}",
                "sentiment": "Unknown",
                "key_entities": {},
            }

    async def generate_draft(self, topic: str, tone: str = "professional") -> dict:
        """Generate a full article draft based on a topic and tone."""
        if not self.client:
            return {"title": f"Draft: {topic}", "content": "DeepSeek API key is not configured. AI Draft generation acts as a mock."}

        messages = [
            {
                "role": "system",
                "content": "You are an expert content writer. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": (
                    f"Write a comprehensive, well-structured article.\n\n"
                    f"Topic: {topic}\nTone: {tone}\n\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"title": "A catchy, SEO-friendly title", '
                    f'"content": "The full article content formatted in Markdown, with appropriate headings and paragraphs."}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            return {
                "title": result.get("title", f"Draft: {topic}"),
                "content": result.get("content", "Error generating content."),
            }
        except APIStatusError as e:
            msg = "Недостаточно средств на балансе API (402)." if e.status_code == 402 else str(e)
            logger.error("DeepSeek API Error: %s", msg)
            return {"title": "Generation Failed", "content": msg}
        except Exception as e:
            logger.exception("Error during DeepSeek draft generation: %s", str(e))
            return {"title": "Generation Failed", "content": str(e)}

    async def generate_seo(self, content: str) -> dict:
        """Generate SEO metadata based on existing content."""
        if not self.client:
            return {
                "title": "Mock SEO Title",
                "meta_description": "Mock SEO metadata description.",
                "keywords": ["mock", "seo"],
            }

        messages = [
            {
                "role": "system",
                "content": "You are an SEO specialist. Always respond with valid JSON only.",
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following article content and generate highly engaging SEO metadata.\n\n"
                    f"Content:\n{content[:15000]}\n\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"title": "A highly clickable, SEO-optimized title (Max 60 chars)", '
                    f'"meta_description": "A compelling summary designed for search engines (Max 160 chars)", '
                    f'"keywords": ["keyword1", "keyword2", "long tail keyword"]}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            return {
                "title": result.get("title", ""),
                "meta_description": result.get("meta_description", ""),
                "keywords": result.get("keywords", []),
            }
        except APIStatusError as e:
            msg = "Недостаточно средств (402)" if e.status_code == 402 else str(e)
            logger.error("DeepSeek API Error: %s", msg)
            return {"title": "", "meta_description": msg, "keywords": []}
        except Exception as e:
            logger.exception("Error during DeepSeek SEO generation: %s", str(e))
            return {"title": "", "meta_description": str(e), "keywords": []}

    async def _build_chat_messages(
        self,
        message: str,
        history: list[dict] | None = None,
        language: str = "ru",
    ) -> tuple[list[dict], str]:
        """Build OpenAI messages list and fallback reply for unavailable client."""
        language_map = {
            "ru": "Russian",
            "en": "English",
            "kk": "Kazakh",
        }
        target_language = language_map.get(language, "Russian")
        if not self.client:
            fallback = (
                "AI assistant is currently unavailable. Please contact the administrator."
                if language == "en"
                else "AI көмекшісі қазір қолжетімсіз. Әкімшіге хабарласыңыз."
                if language == "kk"
                else "AI ассистент сейчас недоступен (API ключ не настроен). Пожалуйста, обратитесь к администратору."
            )
            return [], fallback

        system_context = (
            "You are an AI assistant for a Content Management System (CMS). Your name is \"AI Helper\".\n"
            "You help users with:\n"
            "- Creating and editing articles (title must be 5+ chars, content 50+ chars)\n"
            "- Understanding content validation and AI analysis pipeline\n"
            "- Explaining article statuses (draft, pending, validating, analyzing, published, rejected)\n"
            "- Tips on writing better content for higher quality scores\n"
            "- SEO optimization advice\n"
            "- General CMS navigation guidance\n\n"
            "Key system info:\n"
            "- Articles go through: Create → Validation → AI Analysis → Published\n"
            "- AI analysis checks: category, tags, toxicity, quality, readability, summary, sentiment\n"
            "- Users can filter articles by status, category, tags, and search\n"
            "- Admins can approve/reject articles\n\n"
            f"Be helpful, friendly, and concise. Always answer in {target_language}, regardless of the input language.\n"
            f"If the user asks in another language, still answer in {target_language}."
        )

        messages = [{"role": "system", "content": system_context}]
        if history:
            for msg in history:
                role = "assistant" if msg["role"] == "assistant" else "user"
                messages.append({"role": role, "content": msg["content"]})
        messages.append({"role": "user", "content": message})
        return messages, ""

    async def chat(
        self,
        message: str,
        history: list[dict] | None = None,
        language: str = "ru",
    ) -> dict:
        """Handle conversational AI chat for CMS assistance."""
        messages, fallback = await self._build_chat_messages(message, history, language)
        if not messages:
            return {"reply": fallback}

        try:
            raw = await self._chat(messages)
            return {"reply": raw}
        except APIStatusError as e:
            if e.status_code == 402:
                msg = "Извините, у сервиса ИИ закончился баланс (402). Обратитесь к администратору."
                if language == "en":
                    msg = "The AI service has insufficient balance (402). Please contact the administrator."
                elif language == "kk":
                    msg = "AI сервисінің балансы жеткіліксіз (402). Әкімшіге хабарласыңыз."
            else:
                msg = (
                    f"AI service API error: {e.status_code}"
                    if language == "en"
                    else f"AI сервис API қатесі: {e.status_code}"
                    if language == "kk"
                    else f"Ошибка API сервиса ИИ: {e.status_code}"
                )
            logger.error("DeepSeek API Error during chat: %s", msg)
            return {"reply": msg}
        except Exception as e:
            logger.exception("Error during DeepSeek chat: %s", str(e))
            return {
                "reply": (
                    "Sorry, an error occurred while processing your request. Please try again later."
                    if language == "en"
                    else "Сұрауыңызды өңдеу кезінде қате пайда болды. Кейінірек қайталап көріңіз."
                    if language == "kk"
                    else "Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже."
                )
            }

    async def chat_stream(
        self,
        message: str,
        history: list[dict] | None = None,
        language: str = "ru",
    ) -> AsyncIterator[str]:
        """Stream conversational AI chat tokens for SSE."""
        messages, fallback = await self._build_chat_messages(message, history, language)
        if not messages:
            yield fallback
            return

        try:
            stream = await self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.3,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except APIStatusError as e:
            if e.status_code == 402:
                msg = "Извините, у сервиса ИИ закончился баланс (402). Обратитесь к администратору."
                if language == "en":
                    msg = "The AI service has insufficient balance (402). Please contact the administrator."
                elif language == "kk":
                    msg = "AI сервисінің балансы жеткіліксіз (402). Әкімшіге хабарласыңыз."
            else:
                msg = (
                    f"AI service API error: {e.status_code}"
                    if language == "en"
                    else f"AI сервис API қатесі: {e.status_code}"
                    if language == "kk"
                    else f"Ошибка API сервиса ИИ: {e.status_code}"
                )
            logger.error("DeepSeek API Error during chat stream: %s", msg)
            yield msg
        except Exception as e:
            logger.exception("Error during DeepSeek chat stream: %s", str(e))
            yield (
                "Sorry, an error occurred while processing your request. Please try again later."
                if language == "en"
                else "Сұрауыңызды өңдеу кезінде қате пайда болды. Кейінірек қайталап көріңіз."
                if language == "kk"
                else "Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже."
            )

    async def validate_user_input(self, title: str, content: str, language: str = "ru") -> dict:
        """Moderation validation (profanity / threats / self-harm / toxicity) with AI + deterministic fallback."""

        def _normalize(text: str) -> str:
            text = (text or "").lower()
            text = text.replace("ё", "е")
            return text

        def _local_moderation(title_text: str, body_text: str) -> dict:
            full = _normalize(f"{title_text}\n{body_text}")

            # Minimal-but-useful Russian moderation patterns (best-effort, not exhaustive)
            profanity_patterns = [
                r"\bбля(дь|ть|ха|)\b",
                r"\bсука\b",
                r"\bхуй(ня|ло|ли|)\b",
                r"\bпизд(а|ец|еть|)\b",
                r"\bеб(а|ал|ать|ан|)\b",
                r"\bмраз(ь|ота)\b",
            ]
            threat_patterns = [
                r"\bя\s+(тебя|вас)\s+(убью|убьюсь|зарежу|покалечу|изобью|взорву)\b",
                r"\bубью\b",
                r"\bзарежу\b",
                r"\bвзорву\b",
                r"\bпокалечу\b",
                r"\bизобью\b",
            ]
            self_harm_patterns = [
                r"\bсуицид\b",
                r"\bпоконч(ить|у)\s+с\s+собой\b",
                r"\bхочу\s+умереть\b",
                r"\bповес(иться|юсь)\b",
                r"\bпорез(ать|аться)\b",
            ]

            issues: list[str] = []
            suggestions: list[str] = []
            score = 100

            def _count_matches(patterns: list[str]) -> int:
                cnt = 0
                for p in patterns:
                    try:
                        cnt += len(re.findall(p, full, flags=re.IGNORECASE))
                    except re.error:
                        continue
                return cnt

            prof_cnt = _count_matches(profanity_patterns)
            thr_cnt = _count_matches(threat_patterns)
            sh_cnt = _count_matches(self_harm_patterns)

            if prof_cnt > 0:
                issues.append(f"Обнаружена нецензурная лексика (≈{prof_cnt} совп.)")
                suggestions.append("Убери мат/оскорбления или замени нейтральными словами.")
                score -= min(40, 10 * prof_cnt)

            if thr_cnt > 0:
                issues.append(f"Обнаружены угрозы/насилие (≈{thr_cnt} совп.)")
                suggestions.append("Удали угрозы и формулировки про насилие.")
                score -= min(60, 20 * thr_cnt)

            if sh_cnt > 0:
                issues.append("Обнаружены признаки самоповреждения/суицида.")
                suggestions.append("Не публикуй такой контент. Если это про реальную ситуацию — обратись за помощью к близким/специалистам.")
                score -= 80

            score = max(0, min(100, score))
            is_valid = (thr_cnt == 0 and sh_cnt == 0 and prof_cnt == 0)
            reason = "Ок" if is_valid else (issues[0] if issues else "Контент требует модерации")

            return {
                "is_valid": is_valid,
                "reason": reason,
                "score": score,
                "issues": issues,
                "suggestions": suggestions,
            }

        local = _local_moderation(title, content)

        # If no AI key — return deterministic moderation
        if not self.client:
            local["reason"] = (
                local["reason"]
                + " (AI недоступен: не настроен DEEPSEEK_API_KEY)"
            )
            return local

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict content moderation system for a CMS. "
                    "Detect profanity, obscenity, harassment, threats/violence, and self-harm content. "
                    f"Return reason, issues and suggestions in {'English' if language == 'en' else 'Kazakh' if language == 'kk' else 'Russian'}. "
                    "Always respond with valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Moderate the following text for safety.\n\n"
                    f"Title: {title}\n\n"
                    f"Content:\n{content[:5000]}\n\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"is_valid": true/false, '
                    f'"reason": "Brief explanation (max 120 chars)", '
                    f'"score": 0-100, '
                    f'"issues": ["short bullet issues"], '
                    f'"suggestions": ["short actionable suggestions"]}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            ai = {
                "is_valid": bool(result.get("is_valid", True)),
                "reason": str(result.get("reason", ""))[:200],
                "score": int(result.get("score", 100)) if str(result.get("score", "")).isdigit() else 100,
                "issues": result.get("issues", []) if isinstance(result.get("issues", []), list) else [],
                "suggestions": result.get("suggestions", []) if isinstance(result.get("suggestions", []), list) else [],
            }

            # Merge: be conservative (invalid if either says invalid)
            merged_valid = bool(local.get("is_valid", True)) and bool(ai.get("is_valid", True))
            merged_score = min(int(local.get("score", 100)), int(ai.get("score", 100)))
            merged_issues = list(dict.fromkeys([*local.get("issues", []), *ai.get("issues", [])]))
            merged_suggestions = list(dict.fromkeys([*local.get("suggestions", []), *ai.get("suggestions", [])]))
            merged_reason = ai["reason"] or local.get("reason", "")

            return {
                "is_valid": merged_valid,
                "reason": merged_reason,
                "score": merged_score,
                "issues": merged_issues,
                "suggestions": merged_suggestions,
            }
        except APIStatusError as e:
            logger.error("DeepSeek API Error during AI validation: %s", e)
            local["reason"] = (
                local.get("reason", "")
                + (" (AI: 402 баланс)" if e.status_code == 402 else " (AI: ошибка)")
            ).strip()
            return local
        except Exception as e:
            logger.exception("Error during DeepSeek AI validation: %s", str(e))
            local["reason"] = (local.get("reason", "") + " (AI: ошибка разбора ответа)").strip()
            return local

    async def analyze_csv(
        self,
        columns: list[str],
        sample_rows: list[dict],
        total_rows: int,
        filename: str,
        language: str = "ru",
    ) -> dict:
        """Analyze CSV data using DeepSeek AI."""
        target_language = "English" if language == "en" else "Kazakh" if language == "kk" else "Russian"
        if not self.client:
            return {
                "summary": (
                    "AI analysis unavailable (API key not configured)."
                    if language == "en"
                    else "AI талдауы қолжетімсіз (API кілті бапталмаған)."
                    if language == "kk"
                    else "AI analysis unavailable (API key not configured)."
                ),
                "data_quality": {"completeness": 0.0, "consistency": 0.0, "overall": 0.0},
                "anomalies": ["AI service is not configured"],
                "recommendations": [
                    "Configure DEEPSEEK_API_KEY to enable AI analysis"
                ],
            }

        # Build a text representation of the CSV data
        sample_text = f"Columns: {', '.join(columns)}\n\n"
        sample_text += f"Total rows: {total_rows}\n"
        sample_text += f"Sample data (first {len(sample_rows)} rows):\n"
        for i, row in enumerate(sample_rows[:30], 1):
            row_str = " | ".join(f"{k}: {v}" for k, v in row.items())
            sample_text += f"  Row {i}: {row_str}\n"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert data analyst. Analyze CSV datasets and provide insights. "
                    f"Always write summary, anomalies and recommendations in {target_language}. "
                    "Always respond with valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following CSV dataset.\n\n"
                    f"Filename: {filename}\n"
                    f"{sample_text}\n\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"summary": "A 2-4 sentence overview of the dataset, its purpose and key characteristics", '
                    f'"data_quality": {{"completeness": 0.0-1.0, "consistency": 0.0-1.0, "overall": 0.0-1.0, "details": "Brief explanation"}}, '
                    f'"anomalies": ["List of detected anomalies, missing values, outliers, or data issues"], '
                    f'"recommendations": ["List of actionable recommendations for improving the data"]}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            return {
                "summary": result.get("summary", "No summary available."),
                "data_quality": result.get("data_quality", {"completeness": 0.0, "consistency": 0.0, "overall": 0.0}),
                "anomalies": result.get("anomalies", []),
                "recommendations": result.get("recommendations", []),
            }
        except APIStatusError as e:
            msg = "Недостаточно средств на балансе API (402)." if e.status_code == 402 else f"Ошибка API: {e}"
            logger.error("DeepSeek API Error during CSV analysis: %s", msg)
            return {
                "summary": msg,
                "data_quality": {"completeness": 0.0, "consistency": 0.0, "overall": 0.0},
                "anomalies": ["API error occurred"],
                "recommendations": [],
            }
        except Exception as e:
            logger.exception("Error during DeepSeek CSV analysis: %s", str(e))
            return {
                "summary": f"Analysis failed: {str(e)[:100]}",
                "data_quality": {"completeness": 0.0, "consistency": 0.0, "overall": 0.0},
                "anomalies": ["Analysis error"],
                "recommendations": [],
            }

    async def analyze_image_metadata(self, metadata: dict, language: str = "ru") -> dict:
        """Analyze image metadata using DeepSeek AI."""
        target_language = "English" if language == "en" else "Kazakh" if language == "kk" else "Russian"
        if not self.client:
            return {
                "ai_summary": (
                    "AI analysis unavailable (API key not configured)."
                    if language == "en"
                    else "AI талдауы қолжетімсіз (API кілті бапталмаған)."
                    if language == "kk"
                    else "AI analysis unavailable (API key not configured)."
                ),
                "ai_recommendations": ["Configure DEEPSEEK_API_KEY to enable AI analysis"],
                "is_suitable": True,
            }

        meta_text = (
            f"Filename: {metadata['filename']}\n"
            f"Format: {metadata['format']}\n"
            f"Dimensions: {metadata['width']}×{metadata['height']} px\n"
            f"File size: {metadata['file_size_kb']:.1f} KB\n"
            f"Color mode: {metadata['color_mode']}\n"
            f"Has EXIF: {metadata['has_exif']}\n"
        )
        if metadata.get("exif_data"):
            for k, v in metadata["exif_data"].items():
                meta_text += f"EXIF {k}: {v}\n"
        if metadata.get("warnings"):
            meta_text += f"Detected issues: {'; '.join(metadata['warnings'])}\n"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an image quality analyst for a Content Management System. "
                    "Evaluate images based on their metadata for use as article cover images. "
                    f"Always write summary and recommendations in {target_language}. "
                    "Always respond with valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following image metadata and assess its suitability "
                    f"as a cover image for an article in a CMS.\n\n"
                    f"{meta_text}\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"ai_summary": "2-3 sentence assessment of the image", '
                    f'"ai_recommendations": ["List of recommendations for improving the image"], '
                    f'"is_suitable": true/false}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            return {
                "ai_summary": result.get("ai_summary", ""),
                "ai_recommendations": result.get("ai_recommendations", []),
                "is_suitable": bool(result.get("is_suitable", True)),
            }
        except APIStatusError as e:
            msg = "Недостаточно средств (402)" if e.status_code == 402 else str(e)
            logger.error("DeepSeek API Error during image analysis: %s", msg)
            return {"ai_summary": msg, "ai_recommendations": [], "is_suitable": True}
        except Exception as e:
            logger.exception("Error during DeepSeek image analysis: %s", str(e))
            return {
                "ai_summary": f"Analysis failed: {str(e)[:100]}",
                "ai_recommendations": [],
                "is_suitable": True,
            }

    async def analyze_document(
        self,
        filename: str,
        content_sample: str,
        word_count: int,
        line_count: int,
        file_size_kb: float,
        language: str = "ru",
    ) -> dict:
        """Analyze a text document using DeepSeek AI."""
        target_language = "English" if language == "en" else "Kazakh" if language == "kk" else "Russian"
        if not self.client:
            return {
                "summary": (
                    "AI analysis unavailable (API key not configured)."
                    if language == "en"
                    else "AI талдауы қолжетімсіз (API кілті бапталмаған)."
                    if language == "kk"
                    else "AI analysis unavailable (API key not configured)."
                ),
                "recommendations": ["Configure DEEPSEEK_API_KEY to enable AI analysis"],
                "category": "unknown",
                "quality_score": 0.0,
                "language": "unknown",
            }

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert document analyzer. Analyze text documents and provide insights. "
                    f"Always write summary, recommendations and category in {target_language}. "
                    "Always respond with valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following document and provide insights.\n\n"
                    f"Filename: {filename}\n"
                    f"Size: {file_size_kb:.1f} KB\n"
                    f"Words: {word_count}\n"
                    f"Lines: {line_count}\n\n"
                    f"Content sample (first 3000 chars):\n{content_sample}\n\n"
                    f"Return ONLY a JSON object with this schema:\n"
                    f'{{"summary": "A concise 2-3 sentence summary of the document content", '
                    f'"recommendations": ["List of actionable recommendations for the document"], '
                    f'"category": "Document category (e.g., Report, Article, Contract, Manual, Letter, Other)", '
                    f'"quality_score": 0.0-1.0, '
                    f'"language": "Detected language (e.g., Russian, English, etc.)"}}'
                ),
            },
        ]

        try:
            raw = await self._chat(messages, response_format={"type": "json_object"})
            result = json.loads(raw)
            return {
                "summary": result.get("summary", "No summary available."),
                "recommendations": result.get("recommendations", []),
                "category": result.get("category", "unknown"),
                "quality_score": result.get("quality_score", 0.0),
                "language": result.get("language", "unknown"),
            }
        except APIStatusError as e:
            msg = "Недостаточно средств на балансе API (402)." if e.status_code == 402 else f"Ошибка API: {e}"
            logger.error("DeepSeek API Error during document analysis: %s", msg)
            return {
                "summary": msg,
                "recommendations": [],
                "category": "unknown",
                "quality_score": 0.0,
                "language": "unknown",
            }
        except Exception as e:
            logger.exception("Error during DeepSeek document analysis: %s", str(e))
            return {
                "summary": f"Analysis failed: {str(e)[:100]}",
                "recommendations": [],
                "category": "unknown",
                "quality_score": 0.0,
                "language": "unknown",
            }
