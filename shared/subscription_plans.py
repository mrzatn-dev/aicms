"""
Subscription plans — prices in Kazakhstani Tenge (KZT).
"""

from dataclasses import dataclass
from typing import Literal

PlanId = Literal["free", "pro", "team"]


@dataclass(frozen=True)
class SubscriptionPlan:
    id: PlanId
    name_ru: str
    name_en: str
    name_kk: str
    price_kzt: int
    price_label_ru: str
    billing_period_ru: str
    ai_requests_per_month: int
    audio_minutes_per_month: int
    max_file_mb: int
    team_seats: int
    features_ru: tuple[str, ...]
    features_en: tuple[str, ...]
    features_kk: tuple[str, ...]
    highlighted: bool = False


PLANS: dict[PlanId, SubscriptionPlan] = {
    "free": SubscriptionPlan(
        id="free",
        name_ru="Бесплатный",
        name_en="Free",
        name_kk="Тегін",
        price_kzt=0,
        price_label_ru="0 ₸",
        billing_period_ru="навсегда",
        ai_requests_per_month=30,
        audio_minutes_per_month=30,
        max_file_mb=25,
        team_seats=1,
        features_ru=(
            "30 AI-запросов в месяц",
            "Транскрипция до 30 мин/мес",
            "Файлы до 25 МБ",
            "Базовые инструменты CMS",
        ),
        features_en=(
            "30 AI requests per month",
            "Up to 30 min transcription/month",
            "Files up to 25 MB",
            "Core CMS tools",
        ),
        features_kk=(
            "Айына 30 AI сұрау",
            "Айына 30 мин транскрипция",
            "25 МБ-қа дейін файлдар",
            "Негізгі CMS құралдары",
        ),
    ),
    "pro": SubscriptionPlan(
        id="pro",
        name_ru="Профессиональный",
        name_en="Professional",
        name_kk="Кәсіби",
        price_kzt=4990,
        price_label_ru="4 990 ₸",
        billing_period_ru="в месяц",
        ai_requests_per_month=500,
        audio_minutes_per_month=600,
        max_file_mb=100,
        team_seats=1,
        highlighted=True,
        features_ru=(
            "500 AI-запросов в месяц",
            "Транскрипция до 10 ч/мес",
            "Файлы до 100 МБ",
            "Приоритетная обработка",
            "Расширенная аналитика",
        ),
        features_en=(
            "500 AI requests per month",
            "Up to 10 h transcription/month",
            "Files up to 100 MB",
            "Priority processing",
            "Advanced analytics",
        ),
        features_kk=(
            "Айына 500 AI сұрау",
            "Айына 10 сағ транскрипция",
            "100 МБ-қа дейін файлдар",
            "Басымдықты өңдеу",
            "Кеңейтілген аналитика",
        ),
    ),
    "team": SubscriptionPlan(
        id="team",
        name_ru="Команда",
        name_en="Team",
        name_kk="Команда",
        price_kzt=14990,
        price_label_ru="14 990 ₸",
        billing_period_ru="в месяц",
        ai_requests_per_month=2000,
        audio_minutes_per_month=3000,
        max_file_mb=100,
        team_seats=5,
        features_ru=(
            "2 000 AI-запросов в месяц",
            "Транскрипция до 50 ч/мес",
            "До 5 пользователей",
            "Админ-панель и аудит",
            "Приоритетная поддержка",
        ),
        features_en=(
            "2,000 AI requests per month",
            "Up to 50 h transcription/month",
            "Up to 5 users",
            "Admin panel and audit",
            "Priority support",
        ),
        features_kk=(
            "Айына 2 000 AI сұрау",
            "Айына 50 сағ транскрипция",
            "5 пайдаланушыға дейін",
            "Админ панель және аудит",
            "Басымдықты қолдау",
        ),
    ),
}


def get_plan(plan_id: str) -> SubscriptionPlan | None:
    return PLANS.get(plan_id)  # type: ignore[arg-type]


def list_plans() -> list[SubscriptionPlan]:
    return [PLANS["free"], PLANS["pro"], PLANS["team"]]
