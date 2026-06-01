"""Subscription quota checks (monthly AI usage)."""

import uuid
from calendar import monthrange
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.user_ai_history import UserAIHistory
from shared.models.user_subscription import SubscriptionStatus, UserSubscription
from shared.subscription_plans import PLANS, PlanId, get_plan


def _month_start(now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month_start(start: datetime) -> datetime:
    year, month = start.year, start.month
    if month == 12:
        return start.replace(year=year + 1, month=1)
    return start.replace(month=month + 1)


def default_period_end(start: datetime | None = None) -> datetime:
    """End of current calendar month."""
    start = start or _month_start()
    year, month = start.year, start.month
    last_day = monthrange(year, month)[1]
    return start.replace(
        day=last_day, hour=23, minute=59, second=59, microsecond=999999
    )


async def get_or_create_subscription(
    session: AsyncSession, user_id: uuid.UUID
) -> UserSubscription:
    result = await session.execute(
        select(UserSubscription).where(UserSubscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        await _maybe_roll_period(session, sub)
        return sub

    now = datetime.now(timezone.utc)
    period_start = _month_start(now)
    sub = UserSubscription(
        user_id=user_id,
        plan_id="free",
        status=SubscriptionStatus.ACTIVE,
        current_period_start=period_start,
        current_period_end=default_period_end(period_start),
    )
    session.add(sub)
    await session.flush()
    await session.refresh(sub)
    return sub


async def _maybe_roll_period(session: AsyncSession, sub: UserSubscription) -> None:
    now = datetime.now(timezone.utc)
    if sub.plan_id == "free":
        period_start = _month_start(now)
        if sub.current_period_start < period_start:
            sub.current_period_start = period_start
            sub.current_period_end = default_period_end(period_start)
            sub.status = SubscriptionStatus.ACTIVE
            await session.flush()
        return

    if now > sub.current_period_end:
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=30)
        sub.status = SubscriptionStatus.ACTIVE
        await session.flush()


async def count_ai_requests_in_period(
    session: AsyncSession,
    user_id: uuid.UUID,
    period_start: datetime,
) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(UserAIHistory)
        .where(
            UserAIHistory.user_id == user_id,
            UserAIHistory.created_at >= period_start,
        )
    )
    return int(result.scalar_one())


async def get_usage(
    session: AsyncSession, user_id: uuid.UUID, plan_id: str, period_start: datetime
) -> dict:
    plan = get_plan(plan_id) or PLANS["free"]
    ai_used = await count_ai_requests_in_period(session, user_id, period_start)
    return {
        "ai_requests_used": ai_used,
        "ai_requests_limit": plan.ai_requests_per_month,
        "audio_minutes_used": 0.0,
        "audio_minutes_limit": plan.audio_minutes_per_month,
    }


async def enforce_ai_quota(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    role: str | None = None,
) -> None:
    if role and role.lower() == "admin":
        return

    sub = await get_or_create_subscription(session, user_id)
    if sub.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Подписка неактивна. Выберите тариф в разделе «Подписка».",
        )

    plan = get_plan(sub.plan_id)
    if not plan:
        plan = PLANS["free"]

    used = await count_ai_requests_in_period(session, user_id, sub.current_period_start)
    if used >= plan.ai_requests_per_month:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Лимит AI-запросов исчерпан ({plan.ai_requests_per_month}/мес). "
                f"Перейдите на тариф «{PLANS['pro'].name_ru}» — {PLANS['pro'].price_label_ru}."
            ),
        )


def activate_paid_plan(sub: UserSubscription, plan_id: PlanId) -> None:
    now = datetime.now(timezone.utc)
    sub.plan_id = plan_id
    sub.status = SubscriptionStatus.ACTIVE
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=30)
    sub.updated_at = now
