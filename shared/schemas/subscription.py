"""Subscription API schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PlanIdLiteral = Literal["free", "pro", "team"]


class SubscriptionPlanFeature(BaseModel):
    text: str


class SubscriptionPlanResponse(BaseModel):
    id: PlanIdLiteral
    name: str
    price_kzt: int
    price_label: str
    billing_period: str
    currency: str = "KZT"
    ai_requests_per_month: int
    audio_minutes_per_month: int
    max_file_mb: int
    team_seats: int
    features: list[str]
    highlighted: bool = False


class SubscriptionUsageResponse(BaseModel):
    ai_requests_used: int
    ai_requests_limit: int
    audio_minutes_used: float
    audio_minutes_limit: int
    period_start: datetime
    period_end: datetime


class UserSubscriptionResponse(BaseModel):
    plan_id: PlanIdLiteral
    plan_name: str
    status: str
    price_kzt: int
    price_label: str
    billing_period: str
    currency: str = "KZT"
    current_period_start: datetime
    current_period_end: datetime
    usage: SubscriptionUsageResponse
    is_active: bool


class SubscriptionPlansListResponse(BaseModel):
    plans: list[SubscriptionPlanResponse]
    currency: str = "KZT"
    payment_note: str


class ChangeSubscriptionRequest(BaseModel):
    plan_id: PlanIdLiteral = Field(..., description="Target plan: free, pro, or team")


class ChangeSubscriptionResponse(BaseModel):
    subscription: UserSubscriptionResponse
    message: str
