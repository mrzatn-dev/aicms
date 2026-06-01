"""Build subscription API responses from DB + plan catalog."""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from shared.schemas.subscription import (
    ChangeSubscriptionResponse,
    SubscriptionPlanResponse,
    SubscriptionPlansListResponse,
    SubscriptionUsageResponse,
    UserSubscriptionResponse,
)
from shared.subscription_plans import PLANS, PlanId, get_plan, list_plans
from shared.subscription_quota import (
    activate_paid_plan,
    default_period_end,
    get_or_create_subscription,
    get_usage,
    _month_start,
)
from shared.models.user_subscription import SubscriptionStatus, UserSubscription


PAYMENT_NOTE_RU = (
    "Оплата в тенге (₸). Демо-активация для учебного проекта — "
    "реальная интеграция Kaspi Pay / банковская карта подключается отдельно."
)
PAYMENT_NOTE_EN = (
    "Prices in Kazakhstani Tenge (₸). Demo activation for the diploma project — "
    "Kaspi Pay / card integration can be added separately."
)
PAYMENT_NOTE_KK = (
    "Баға теңгемен (₸). Оқу жобасы үшін демо-іске қосу — "
    "Kaspi Pay / карта интеграциясын кейін қосуға болады."
)


def _plan_name(plan, locale: str) -> str:
    if locale == "en":
        return plan.name_en
    if locale == "kk":
        return plan.name_kk
    return plan.name_ru


def _plan_features(plan, locale: str) -> list[str]:
    if locale == "en":
        return list(plan.features_en)
    if locale == "kk":
        return list(plan.features_kk)
    return list(plan.features_ru)


def plan_to_response(plan, locale: str = "ru") -> SubscriptionPlanResponse:
    billing = plan.billing_period_ru
    if locale == "en":
        billing = "per month" if plan.price_kzt else "forever"
    elif locale == "kk":
        billing = "айына" if plan.price_kzt else "мәңгілік"

    return SubscriptionPlanResponse(
        id=plan.id,
        name=_plan_name(plan, locale),
        price_kzt=plan.price_kzt,
        price_label=plan.price_label_ru,
        billing_period=billing,
        ai_requests_per_month=plan.ai_requests_per_month,
        audio_minutes_per_month=plan.audio_minutes_per_month,
        max_file_mb=plan.max_file_mb,
        team_seats=plan.team_seats,
        features=_plan_features(plan, locale),
        highlighted=plan.highlighted,
    )


async def build_user_subscription_response(
    session: AsyncSession,
    user_id: uuid.UUID,
    locale: str = "ru",
) -> UserSubscriptionResponse:
    sub = await get_or_create_subscription(session, user_id)
    plan = get_plan(sub.plan_id) or PLANS["free"]
    usage_data = await get_usage(session, user_id, sub.plan_id, sub.current_period_start)
    now = datetime.now(timezone.utc)
    is_active = sub.status == SubscriptionStatus.ACTIVE and now <= sub.current_period_end

    return UserSubscriptionResponse(
        plan_id=plan.id,  # type: ignore[arg-type]
        plan_name=_plan_name(plan, locale),
        status=sub.status.value,
        price_kzt=plan.price_kzt,
        price_label=plan.price_label_ru,
        billing_period=plan.billing_period_ru,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        is_active=is_active,
        usage=SubscriptionUsageResponse(
            ai_requests_used=usage_data["ai_requests_used"],
            ai_requests_limit=usage_data["ai_requests_limit"],
            audio_minutes_used=usage_data["audio_minutes_used"],
            audio_minutes_limit=usage_data["audio_minutes_limit"],
            period_start=sub.current_period_start,
            period_end=sub.current_period_end,
        ),
    )


async def list_plans_response(locale: str = "ru") -> SubscriptionPlansListResponse:
    note = PAYMENT_NOTE_RU
    if locale == "en":
        note = PAYMENT_NOTE_EN
    elif locale == "kk":
        note = PAYMENT_NOTE_KK

    return SubscriptionPlansListResponse(
        plans=[plan_to_response(p, locale) for p in list_plans()],
        payment_note=note,
    )


async def change_plan(
    session: AsyncSession,
    user_id: uuid.UUID,
    plan_id: PlanId,
    locale: str = "ru",
) -> ChangeSubscriptionResponse:
    if not get_plan(plan_id):
        raise ValueError(f"Unknown plan: {plan_id}")

    sub = await get_or_create_subscription(session, user_id)
    now = datetime.now(timezone.utc)

    if plan_id == "free":
        sub.plan_id = "free"
        sub.status = SubscriptionStatus.ACTIVE
        sub.current_period_start = _month_start(now)
        sub.current_period_end = default_period_end(sub.current_period_start)
    else:
        activate_paid_plan(sub, plan_id)

    sub.updated_at = now
    await session.flush()

    plan = get_plan(plan_id) or PLANS["free"]
    if plan_id == "free":
        msg_ru = "Вы перешли на бесплатный тариф."
    else:
        msg_ru = (
            f"Тариф «{plan.name_ru}» активирован (демо). "
            f"Списание {plan.price_label_ru} — в учебной версии не выполняется."
        )

    if locale == "en":
        msg_ru = (
            f"Plan «{plan.name_en}» activated (demo). "
            f"No real charge of {plan.price_label_ru}."
            if plan_id != "free"
            else "You switched to the free plan."
        )
    elif locale == "kk" and plan_id != "free":
        msg_ru = (
            f"«{plan.name_kk}» тарифі іске қосылды (демо). "
            f"{plan.price_label_ru} нақты емес."
        )

    response = await build_user_subscription_response(session, user_id, locale)
    return ChangeSubscriptionResponse(subscription=response, message=msg_ru)
