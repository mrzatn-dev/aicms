'use client';

import { Check, CreditCard, Loader2, Sparkles } from 'lucide-react';

import { getSubscriptionCopy } from '../../subscription-i18n';
import type { LocaleCode } from '../../types';

export interface SubscriptionPlan {
    id: string;
    name: string;
    price_kzt: number;
    price_label: string;
    billing_period: string;
    features: string[];
    highlighted?: boolean;
}

export interface SubscriptionData {
    plan_id: string;
    plan_name: string;
    price_label: string;
    billing_period: string;
    current_period_start: string;
    current_period_end: string;
    usage: {
        ai_requests_used: number;
        ai_requests_limit: number;
        audio_minutes_used: number;
        audio_minutes_limit: number;
    };
}

interface SubscriptionTabProps {
    locale: LocaleCode;
    loading: boolean;
    plans: SubscriptionPlan[];
    subscription: SubscriptionData | null;
    paymentNote: string;
    changingPlanId: string | null;
    onSelectPlan: (planId: string) => void;
}

function formatDate(iso: string, locale: LocaleCode) {
    const loc = locale === 'kk' ? 'kk-KZ' : locale === 'en' ? 'en-GB' : 'ru-RU';
    return new Date(iso).toLocaleDateString(loc, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-surface-600">{label}</span>
                <span className="font-medium text-surface-900">
                    {used} / {limit}
                </span>
            </div>
            <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function SubscriptionTab({
    locale,
    loading,
    plans,
    subscription,
    paymentNote,
    changingPlanId,
    onSelectPlan,
}: SubscriptionTabProps) {
    const copy = getSubscriptionCopy(locale);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
                    <CreditCard className="w-7 h-7 text-emerald-600" />
                    {copy.title}
                </h2>
                <p className="text-surface-600 mt-1">{copy.subtitle}</p>
            </div>

            {subscription && (
                <div className="card p-6 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white">
                    <p className="text-sm font-medium text-emerald-700 mb-1">{copy.currentPlan}</p>
                    <div className="flex flex-wrap items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-surface-900">{subscription.plan_name}</span>
                        <span className="text-lg text-emerald-700 font-semibold">{subscription.price_label}</span>
                        <span className="text-sm text-surface-500">/ {subscription.billing_period}</span>
                    </div>
                    <p className="text-xs text-surface-500 mb-4">
                        {copy.period}: {formatDate(subscription.current_period_start, locale)} —{' '}
                        {formatDate(subscription.current_period_end, locale)}
                    </p>
                    <h4 className="text-sm font-semibold text-surface-800 mb-3">{copy.usageTitle}</h4>
                    <div className="space-y-3 max-w-md">
                        <UsageBar
                            used={subscription.usage.ai_requests_used}
                            limit={subscription.usage.ai_requests_limit}
                            label={copy.aiRequests}
                        />
                        <UsageBar
                            used={Math.round(subscription.usage.audio_minutes_used)}
                            limit={subscription.usage.audio_minutes_limit}
                            label={copy.audioMinutes}
                        />
                    </div>
                </div>
            )}

            <p className="text-sm text-surface-500 bg-surface-100 rounded-xl px-4 py-3 border border-surface-200">
                {paymentNote || copy.demoNote}
            </p>

            <div>
                <h3 className="text-lg font-semibold text-surface-900 mb-4">{copy.choosePlan}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = subscription?.plan_id === plan.id;
                        const isHighlighted = plan.highlighted;
                        return (
                            <div
                                key={plan.id}
                                className={`card p-6 flex flex-col relative ${
                                    isHighlighted
                                        ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                                        : ''
                                }`}
                            >
                                {isHighlighted && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Popular
                                    </span>
                                )}
                                <h4 className="text-lg font-bold text-surface-900">{plan.name}</h4>
                                <div className="mt-2 mb-4">
                                    <span className="text-3xl font-bold text-surface-900">{plan.price_label}</span>
                                    <span className="text-sm text-surface-500 ml-1">
                                        {plan.price_kzt === 0 ? copy.forever : copy.perMonth}
                                    </span>
                                </div>
                                <ul className="space-y-2 mb-6 flex-1">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex gap-2 text-sm text-surface-700">
                                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    disabled={isCurrent || changingPlanId === plan.id}
                                    onClick={() => onSelectPlan(plan.id)}
                                    className={
                                        isCurrent
                                            ? 'btn-secondary w-full opacity-70 cursor-default'
                                            : isHighlighted
                                              ? 'btn-primary w-full'
                                              : 'btn-secondary w-full'
                                    }
                                >
                                    {changingPlanId === plan.id ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {copy.activating}
                                        </span>
                                    ) : isCurrent ? (
                                        copy.current
                                    ) : (
                                        copy.activate
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
