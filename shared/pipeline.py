"""
Helpers for updating unified AI pipeline run state from any service.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from shared.models.pipeline_run import PipelineRun, PipelineStatus, stages_for_source

logger = logging.getLogger(__name__)


def build_initial_stages(source_type: str) -> list[dict]:
    """Build the initial stages list for a new pipeline run."""
    now = datetime.now(timezone.utc).isoformat()
    stages = []
    for i, name in enumerate(stages_for_source(source_type)):
        stages.append(
            {
                "name": name,
                "status": "done" if i == 0 else "pending",  # upload is done at creation time
                "started_at": now if i == 0 else None,
                "finished_at": now if i == 0 else None,
                "error": None,
            }
        )
    return stages


async def update_pipeline_stage(
    session: AsyncSession,
    pipeline_id: str | uuid.UUID,
    stage: str,
    status: str,  # running | done | failed
    *,
    error: str | None = None,
    article_id: str | uuid.UUID | None = None,
    transcription_id: str | uuid.UUID | None = None,
    merge_meta: dict[str, Any] | None = None,
) -> PipelineRun | None:
    """Update a single stage of a pipeline run and the overall run state."""
    if isinstance(pipeline_id, str):
        try:
            pipeline_id = uuid.UUID(pipeline_id)
        except ValueError:
            logger.error("Invalid pipeline_id: %s", pipeline_id)
            return None

    result = await session.execute(select(PipelineRun).where(PipelineRun.id == pipeline_id))
    run = result.scalar_one_or_none()
    if not run:
        logger.warning("Pipeline run %s not found", pipeline_id)
        return None

    now = datetime.now(timezone.utc).isoformat()
    stages = list(run.stages or [])
    found = False
    for entry in stages:
        if entry.get("name") == stage:
            found = True
            entry["status"] = status
            if status == "running" and not entry.get("started_at"):
                entry["started_at"] = now
            if status in ("done", "failed"):
                entry.setdefault("started_at", now)
                entry["finished_at"] = now
            entry["error"] = error
            break
    if not found:
        stages.append(
            {
                "name": stage,
                "status": status,
                "started_at": now,
                "finished_at": now if status in ("done", "failed") else None,
                "error": error,
            }
        )

    run.stages = stages
    attributes.flag_modified(run, "stages")
    run.current_stage = stage
    run.updated_at = datetime.now(timezone.utc)

    if article_id:
        run.article_id = uuid.UUID(str(article_id))
    if transcription_id:
        run.transcription_id = uuid.UUID(str(transcription_id))
    if merge_meta:
        meta = dict(run.result_meta or {})
        meta.update(merge_meta)
        run.result_meta = meta
        attributes.flag_modified(run, "result_meta")

    if status == "failed":
        run.status = PipelineStatus.FAILED.value
        run.error = error
        # Remaining pending stages stay pending; run is terminal.
    elif stage == "publish" and status == "done":
        run.status = PipelineStatus.COMPLETED.value

    await session.flush()
    return run
