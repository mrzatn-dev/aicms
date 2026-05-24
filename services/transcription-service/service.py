"""
Business logic for audio/video transcription service.
"""

import json
import os
import re
import asyncio
import tempfile
import time
import logging
from pathlib import Path
from uuid import UUID
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, HTTPException

import openai
import ffmpeg

from shared.models.audio_transcription import AudioTranscription
from shared.schemas.transcription import (
    TranscriptionCreate, TranscriptionResponse, TranscriptionList,
    TranscriptionStats, TranscriptionSegment
)

from repository import TranscriptionRepository

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for handling audio/video transcription."""
    
    def __init__(self, repository: TranscriptionRepository):
        self.repository = repository
        self.openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        self.openai_client = openai.AsyncOpenAI(
            api_key=self.openai_api_key or None,
        )
    
    async def transcribe_file(
        self,
        user_id: UUID,
        file: UploadFile,
        response_language: str = "ru",
    ) -> TranscriptionResponse:
        """Upload and transcribe audio/video file."""
        # Validate file
        await self._validate_file(file)
        
        # Determine file type and format
        file_type, format_ext = self._get_file_info(file.filename)
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format_ext}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        malware_flags = self._scan_upload_for_malware(file.filename or "unknown", content)
        if malware_flags:
            raise HTTPException(
                status_code=400,
                detail="Файл выглядит подозрительным и отклонён проверкой безопасности",
            )
        
        try:
            # Convert to audio if video file
            if file_type == "video":
                audio_path = await self._extract_audio(temp_file_path)
            else:
                audio_path = temp_file_path
            
            # Get duration
            duration = await self._get_audio_duration(audio_path)
            
            # Transcribe using configured provider:
            # - OpenAI when key exists
            # - local faster-whisper fallback otherwise
            transcript_data: Dict[str, Any]
            if self.openai_api_key:
                try:
                    transcript_data = await self._transcribe_with_openai(audio_path)
                except HTTPException as err:
                    logger.warning(
                        "OpenAI transcription failed (%s). Falling back to local model.",
                        err.detail,
                    )
                    transcript_data = await self._transcribe_with_local_whisper(audio_path)
            else:
                transcript_data = await self._transcribe_with_local_whisper(audio_path)
            
            # Create transcription record
            transcription_data = {
                "user_id": user_id,
                "filename": file.filename or "unknown",
                "original_filename": file.filename or "unknown",
                "file_size": len(content),
                "duration": duration,
                "file_type": file_type,
                "format": format_ext,
                "transcript": transcript_data["text"],
                "language": transcript_data.get("language"),
                "confidence": transcript_data.get("avg_confidence"),
                "segments": transcript_data.get("segments", []),
                "model_used": transcript_data.get("model_used", "unknown"),
            }
            
            transcription = await self.repository.create(transcription_data)
            
            # Generate summary and analyze content (async, doesn't block response)
            await self._analyze_transcription(transcription.id, response_language=response_language)

            refreshed = await self.repository.get_any_by_id(transcription.id)
            return self._to_response(refreshed or transcription)
            
        finally:
            # Clean up temporary files
            try:
                os.unlink(temp_file_path)
                if file_type == "video" and 'audio_path' in locals():
                    os.unlink(audio_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temp files: {e}")
    
    async def get_user_transcriptions(
        self, 
        user_id: UUID, 
        page: int, 
        page_size: int,
        file_type: Optional[str] = None
    ) -> TranscriptionList:
        """Get user's transcription history."""
        transcriptions, total = await self.repository.get_user_transcriptions(
            user_id, page, page_size, file_type
        )
        
        return TranscriptionList(
            items=[self._to_response(t) for t in transcriptions],
            total=total,
            page=page,
            page_size=page_size
        )
    
    async def get_transcription(self, user_id: UUID, transcription_id: UUID) -> TranscriptionResponse:
        """Get specific transcription."""
        transcription = await self.repository.get_by_id(user_id, transcription_id)
        if not transcription:
            raise HTTPException(
                status_code=404, 
                detail="Transcription not found"
            )
        return self._to_response(transcription)
    
    async def update_transcription(
        self, 
        user_id: UUID, 
        transcription_id: UUID, 
        update_data: dict
    ) -> TranscriptionResponse:
        """Update transcription."""
        transcription = await self.repository.get_by_id(user_id, transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        updated = await self.repository.update(transcription, update_data)
        return self._to_response(updated)
    
    async def delete_transcription(self, user_id: UUID, transcription_id: UUID) -> None:
        """Delete transcription."""
        transcription = await self.repository.get_by_id(user_id, transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        await self.repository.delete(transcription)
    
    async def get_transcription_stats(self, user_id: UUID) -> TranscriptionStats:
        """Get transcription statistics."""
        stats = await self.repository.get_stats(user_id)
        return TranscriptionStats(**stats)

    def _build_security_verdict(self, transcription: AudioTranscription) -> dict:
        is_malicious = bool(getattr(transcription, "is_malicious", False))
        safety_score = float(getattr(transcription, "safety_score", 0.0) or 0.0)
        categories = list(getattr(transcription, "safety_categories", []) or [])
        is_content_allowed = not is_malicious
        is_safe = is_content_allowed

        if is_safe:
            verdict = "safe"
            summary = "Аудио/видео файл обработан: явных признаков вируса не обнаружено, контент допустим."
        else:
            verdict = "warning"
            summary = "Файл без явных вирусных признаков, но контент помечен как потенциально опасный."

        risk_flags = [f"content:{item}" for item in categories]
        if safety_score >= 0.6:
            risk_flags.append("content:high_risk_score")

        return {
            "is_safe": is_safe,
            "is_content_allowed": is_content_allowed,
            "is_malware_suspected": False,
            "verdict": verdict,
            "summary": summary,
            "risk_flags": risk_flags,
            "scan_engine": "heuristic-static-v1",
        }

    def _to_response(self, transcription: AudioTranscription) -> TranscriptionResponse:
        base = TranscriptionResponse.model_validate(transcription)
        return base.model_copy(
            update={
                "security_verdict": self._build_security_verdict(transcription),
            }
        )
    
    # ── Private helper methods ──────────────────────────────────────
    
    async def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        # Check file size (100MB limit)
        if file.size and file.size > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 100MB"
            )
        
        # Check file type
        allowed_extensions = {
            'audio': ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'],
            'video': ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv']
        }
        
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No filename provided"
            )
        
        ext = file.filename.split('.')[-1].lower()
        all_allowed = allowed_extensions['audio'] + allowed_extensions['video']
        
        if ext not in all_allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed: {', '.join(all_allowed)}"
            )

    def _scan_upload_for_malware(self, filename: str, content: bytes) -> List[str]:
        """Simple static malware indicators for uploaded audio/video files."""
        flags: List[str] = []
        ext = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else ""

        dangerous_ext = {"exe", "dll", "bat", "cmd", "ps1", "scr", "com", "msi"}
        if ext in dangerous_ext:
            flags.append(f"dangerous_extension:{ext}")

        header = content[:8192]
        signatures = [
            (b"MZ", "windows_executable_signature"),
            (b"\x7fELF", "linux_elf_signature"),
            (b"\xcf\xfa\xed\xfe", "mach_o_signature"),
            (b"\xfe\xed\xfa\xcf", "mach_o_signature"),
        ]
        for signature, label in signatures:
            if header.startswith(signature):
                flags.append(label)

        lower_header = header.lower()
        suspicious_markers = [
            (b"<script", "embedded_script_marker"),
            (b"<?php", "php_code_marker"),
            (b"powershell", "powershell_marker"),
            (b"cmd.exe", "cmd_execution_marker"),
        ]
        for marker, label in suspicious_markers:
            if marker in lower_header:
                flags.append(label)

        return flags
    
    def _get_file_info(self, filename: str) -> tuple[str, str]:
        """Determine file type and format."""
        ext = filename.split('.')[-1].lower()
        
        audio_formats = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg']
        video_formats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv']
        
        if ext in audio_formats:
            return "audio", ext
        elif ext in video_formats:
            return "video", ext
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {ext}"
            )
    
    async def _extract_audio(self, video_path: str) -> str:
        """Extract audio from video file."""
        audio_path = video_path.replace(Path(video_path).suffix, ".mp3")
        
        try:
            ffmpeg.input(video_path).output(audio_path, acodec='mp3').overwrite_output().run()
            return audio_path
        except Exception as e:
            logger.error(f"Failed to extract audio: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to process video file"
            )
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds."""
        try:
            probe = ffmpeg.probe(audio_path)
            return float(probe['streams'][0]['duration'])
        except Exception as e:
            logger.warning(f"Could not get duration: {e}")
            return 0.0
    
    def _extract_openai_error_message(self, err: Exception) -> str:
        text = str(err).strip()
        for attr in ("message", "detail"):
            value = getattr(err, attr, None)
            if isinstance(value, str) and value.strip():
                text = value.strip()
                break
        return text or "unknown error"

    async def _transcribe_with_openai(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using OpenAI models with fallback."""
        start_time = time.time()
        model_candidates = ["gpt-4o-mini-transcribe", "whisper-1"]
        errors: List[str] = []

        for model in model_candidates:
            for use_timestamps in (True, False):
                try:
                    with open(audio_path, "rb") as audio_file:
                        kwargs: Dict[str, Any] = {
                            "model": model,
                            "file": audio_file,
                            "response_format": "verbose_json",
                        }
                        if use_timestamps:
                            kwargs["timestamp_granularities"] = ["word", "segment"]

                        response = await self.openai_client.audio.transcriptions.create(**kwargs)

                    processing_time = time.time() - start_time

                    # Convert segments to our format
                    segments = []
                    response_segments = getattr(response, "segments", None) or []
                    for segment in response_segments:
                        segments.append({
                            "start": segment.start,
                            "end": segment.end,
                            "text": segment.text,
                            "confidence": getattr(segment, "avg_logprob", None),
                        })

                    return {
                        "text": getattr(response, "text", "") or "",
                        "language": getattr(response, "language", None),
                        "avg_confidence": getattr(response, "avg_logprob", None),
                        "segments": segments,
                        "processing_time": processing_time,
                        "model_used": model,
                    }
                except openai.AuthenticationError:
                    raise HTTPException(
                        status_code=502,
                        detail="Ошибка авторизации OpenAI. Проверьте OPENAI_API_KEY",
                    )
                except openai.RateLimitError:
                    raise HTTPException(
                        status_code=429,
                        detail="Лимит OpenAI исчерпан. Попробуйте позже",
                    )
                except openai.APIConnectionError:
                    raise HTTPException(
                        status_code=503,
                        detail="Нет соединения с OpenAI API",
                    )
                except openai.BadRequestError as err:
                    err_text = self._extract_openai_error_message(err)
                    errors.append(f"{model} ({'with_ts' if use_timestamps else 'no_ts'}): {err_text}")
                    # For bad request on timestamps we try once without timestamps.
                    if use_timestamps:
                        continue
                except Exception as err:
                    err_text = self._extract_openai_error_message(err)
                    errors.append(f"{model} ({'with_ts' if use_timestamps else 'no_ts'}): {err_text}")

        logger.error("All transcription model attempts failed: %s", " | ".join(errors))
        tail = errors[-1] if errors else "unknown failure"
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось распознать аудио: {tail}",
        )

    async def _transcribe_with_local_whisper(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio locally using faster-whisper (free, no API key)."""
        start_time = time.time()
        model_size = os.getenv("LOCAL_WHISPER_MODEL", "small")

        try:
            from faster_whisper import WhisperModel
        except Exception as err:
            logger.error("Local whisper import failed: %s", err)
            raise HTTPException(
                status_code=500,
                detail=(
                    "Локальная модель недоступна. Убедитесь, что faster-whisper установлен, "
                    "и пересоберите контейнер transcription-service "
                    f"(детали: {self._extract_openai_error_message(err)})"
                ),
            )

        def run_local_transcription() -> Dict[str, Any]:
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            segments_iter, info = model.transcribe(
                audio_path,
                beam_size=3,
                vad_filter=True,
            )
            segments = []
            full_text_parts: List[str] = []
            confidences: List[float] = []

            for segment in segments_iter:
                text = (segment.text or "").strip()
                if text:
                    full_text_parts.append(text)
                avg_logprob = getattr(segment, "avg_logprob", None)
                confidence = None
                if isinstance(avg_logprob, (float, int)):
                    # Convert logprob into an approximate 0..1 range.
                    confidence = max(0.0, min(1.0, float(pow(2.718281828, avg_logprob))))
                    confidences.append(confidence)

                segments.append(
                    {
                        "start": float(getattr(segment, "start", 0.0) or 0.0),
                        "end": float(getattr(segment, "end", 0.0) or 0.0),
                        "text": text,
                        "confidence": confidence,
                    }
                )

            avg_conf = sum(confidences) / len(confidences) if confidences else None
            return {
                "text": " ".join(full_text_parts).strip(),
                "language": getattr(info, "language", None),
                "avg_confidence": avg_conf,
                "segments": segments,
                "processing_time": time.time() - start_time,
                "model_used": f"faster-whisper:{model_size}",
            }

        try:
            result = await asyncio.to_thread(run_local_transcription)
        except Exception as err:
            logger.error("Local whisper transcription failed: %s", err)
            raise HTTPException(
                status_code=500,
                detail=f"Локальное распознавание не удалось: {self._extract_openai_error_message(err)}",
            )

        if not result.get("text"):
            raise HTTPException(
                status_code=500,
                detail="Локальная модель не смогла распознать речь в файле",
            )

        return result

    def _moderate_transcript(self, transcript: str, response_language: str = "ru") -> dict:
        """Run local safety checks on transcript text."""
        normalized = (transcript or "").lower().replace("ё", "е")

        patterns = {
            "profanity": [
                r"\bбля(дь|ть|ха|)\b",
                r"\bсука\b",
                r"\bхуй(ня|ло|ли|)\b",
                r"\bпизд(а|ец|еть|)\b",
                r"\bеб(а|ал|ать|ан|)\b",
                r"\bfuck(ing|ed)?\b",
                r"\bshit\b",
                r"\bbitch\b",
                r"\basshole\b",
            ],
            "threats": [
                r"\bя\s+(тебя|вас)\s+(убью|зарежу|изобью|взорву|покалечу)\b",
                r"\bубью\b",
                r"\bзарежу\b",
                r"\bвзорву\b",
                r"\bkill you\b",
                r"\bshoot\b",
                r"\bstab\b",
            ],
            "self_harm": [
                r"\bсуицид\b",
                r"\bпоконч(ить|у)\s+с\s+собой\b",
                r"\bхочу\s+умереть\b",
                r"\bповес(иться|юсь)\b",
                r"\bkill myself\b",
                r"\bsuicide\b",
                r"\bself[- ]harm\b",
            ],
            "fraud": [
                r"\bпарол[ья]\b",
                r"\bкод\s+из\s+смс\b",
                r"\bперевед[иите]\s+деньги\b",
                r"\bданные\s+карты\b",
                r"\bcvv\b",
                r"\bpassword\b",
                r"\bone[- ]time code\b",
                r"\bbank card\b",
                r"\bseed phrase\b",
                r"\bcrypto wallet\b",
            ],
            "extremism": [
                r"\bтеракт\b",
                r"\bвзорв(ать|ем)\b",
                r"\bрадикал(изм|)\b",
                r"\bэкстрем(изм|ист)\b",
                r"\bterror(ism|ist)?\b",
                r"\bextremis(t|m)\b",
            ],
        }

        category_counts: dict[str, int] = {}
        for category, category_patterns in patterns.items():
            count = 0
            for pattern in category_patterns:
                try:
                    count += len(re.findall(pattern, normalized, flags=re.IGNORECASE))
                except re.error:
                    continue
            if count > 0:
                category_counts[category] = count

        total_hits = sum(category_counts.values())
        risk_score = min(1.0, total_hits * 0.18)
        is_malicious = any(
            category in category_counts
            for category in ("threats", "self_harm", "fraud", "extremism")
        ) or total_hits >= 3

        category_labels = {
            "ru": {
                "profanity": "нецензурная лексика",
                "threats": "угрозы или насилие",
                "self_harm": "самоповреждение или суицид",
                "fraud": "мошенничество или фишинг",
                "extremism": "экстремизм или опасные призывы",
            },
            "en": {
                "profanity": "profanity",
                "threats": "threats or violence",
                "self_harm": "self-harm or suicide",
                "fraud": "fraud or phishing",
                "extremism": "extremism or dangerous incitement",
            },
            "kk": {
                "profanity": "бейәдеп сөздер",
                "threats": "қоқан-лоқы немесе зорлық",
                "self_harm": "өзіне зиян келтіру немесе суицид",
                "fraud": "алаяқтық немесе фишинг",
                "extremism": "экстремизм немесе қауіпті үндеулер",
            },
        }
        labels = category_labels.get(response_language, category_labels["ru"])
        categories = [labels[key] for key in category_counts.keys()]

        if response_language == "en":
            summary = (
                "No obvious dangerous or abusive speech markers were found."
                if not categories
                else f"Detected possible {', '.join(categories)} in the transcript."
            )
        elif response_language == "kk":
            summary = (
                "Транскрипттен айқын қауіпті немесе балағат сөз белгілері табылмады."
                if not categories
                else f"Транскриптте ықтимал {', '.join(categories)} белгілері табылды."
            )
        else:
            summary = (
                "В транскрипте не найдено явных признаков опасной или нецензурной речи."
                if not categories
                else f"В транскрипте обнаружены признаки: {', '.join(categories)}."
            )

        return {
            "is_malicious": is_malicious,
            "safety_score": risk_score,
            "safety_summary": summary,
            "safety_categories": categories,
        }
    
    async def _analyze_transcription(self, transcription_id: UUID, response_language: str = "ru") -> None:
        """Generate summary and analyze content (async)."""
        try:
            transcription = await self.repository.get_any_by_id(transcription_id)
            if not transcription:
                return

            language_map = {
                "ru": "Russian",
                "en": "English",
                "kk": "Kazakh",
            }
            target_language = language_map.get(response_language, "Russian")
            
            # Generate summary using GPT
            summary_prompt = f"""
            Summarize the following transcription in 2-3 sentences.
            Always answer in {target_language}.
            
            {transcription.transcript}
            """
            
            local_safety = self._moderate_transcript(
                transcription.transcript,
                response_language=response_language,
            )
            summary = ""

            try:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "user", "content": summary_prompt}
                    ],
                    max_tokens=150
                )
                summary = response.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"Failed to generate transcription summary: {e}")
                if response_language == "en":
                    summary = "Automatic summary is temporarily unavailable."
                elif response_language == "kk":
                    summary = "Автоматты қысқаша мазмұн қазір қолжетімсіз."
                else:
                    summary = "Автоматическое резюме временно недоступно."

            safety_prompt = f"""
            Analyze the following transcription specifically for audio safety and moderation.
            Check for profanity, obscenity, insults, threats, violence, self-harm, suicide,
            scams, phishing, illegal instructions, extremism, radicalization, harassment,
            and other dangerous content.
            Always answer in {target_language}.

            Return ONLY valid JSON with this schema:
            {{
              "is_malicious": true/false,
              "safety_score": 0.0,
              "safety_summary": "short explanation mentioning why the audio is safe or unsafe",
              "safety_categories": ["risk category names like profanity, threats, fraud"]
            }}

            Transcription:
            {transcription.transcript[:12000]}
            """

            safety_result = {
                "is_malicious": local_safety["is_malicious"],
                "safety_score": local_safety["safety_score"],
                "safety_summary": local_safety["safety_summary"],
                "safety_categories": local_safety["safety_categories"],
            }
            try:
                safety_response = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": safety_prompt}],
                    max_tokens=220,
                    response_format={"type": "json_object"},
                )
                safety_result = json.loads(safety_response.choices[0].message.content.strip())
            except Exception as e:
                logger.warning(f"Failed to run AI safety analysis for transcription: {e}")

            ai_categories = safety_result.get("safety_categories", [])
            merged_categories = list(dict.fromkeys([
                *local_safety.get("safety_categories", []),
                *ai_categories,
            ]))
            merged_score = max(
                float(local_safety.get("safety_score", 0.0) or 0.0),
                float(safety_result.get("safety_score", 0.0) or 0.0),
            )
            merged_is_malicious = bool(local_safety.get("is_malicious", False)) or bool(
                safety_result.get("is_malicious", False)
            )
            merged_summary = (
                str(safety_result.get("safety_summary", "")).strip()
                or str(local_safety.get("safety_summary", "")).strip()
            )[:1000]
            if local_safety.get("safety_categories") and local_safety.get("safety_summary"):
                merged_summary = f"{local_safety['safety_summary']} {merged_summary}".strip()[:1000]
            
            # Extract key topics (simple keyword extraction)
            words = transcription.transcript.lower().split()
            # Remove common words and get most frequent
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'}
            filtered_words = [w for w in words if len(w) > 3 and w not in stop_words]
            word_freq = {}
            for word in filtered_words:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            key_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            key_topics = [topic for topic, count in key_topics]
            
            # Update transcription with analysis
            await self.repository.update(transcription, {
                "summary": summary,
                "key_topics": key_topics,
                "is_malicious": 1 if merged_is_malicious else 0,
                "safety_score": merged_score,
                "safety_summary": merged_summary,
                "safety_categories": merged_categories,
            })
            
        except Exception as e:
            logger.error(f"Failed to analyze transcription: {e}")
            # Don't fail the whole process if analysis fails
