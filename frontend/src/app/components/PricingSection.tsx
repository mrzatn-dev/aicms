'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';

import { api } from '@/lib/api';
import { getPricingCopy } from '@/app/pricing-i18n';
import type { LocaleCode } from '@/app/i18n';
import ScrollReveal from '@/app/components/ScrollReveal';

interface Plan {
    id: string;
    name: string;
    price_kzt: number;
    price_label: string;
    billing_period: string;
    features: string[];
    highlighted?: boolean;
}

interface PricingSectionProps {
    locale: LocaleCode;
}

export default function PricingSection({ locale }: PricingSectionProps) {
    const copy = getPricingCopy(locale);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [paymentNote, setPaymentNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await api.getSubscriptionPlans(locale);
                if (!cancelled) {
                    setPlans(data.plans || []);
                    setPaymentNote(data.payment_note || '');
                }
            } catch {
                if (!cancelled) setPlans([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [locale]);

    return (
        <section id="pricing" className="py-20 px-6 bg-white border-y border-surface-200/60">
            <div className="max-w-6xl mx-auto">
                <ScrollReveal className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mb-4 font-display">
                        {copy.title}
                    </h2>
                    <p className="text-surface-700/70 max-w-2xl mx-auto">{copy.subtitle}</p>
                </ScrollReveal>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                ) : (
                    <ScrollReveal delay={80}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`card p-6 flex flex-col relative ${
                                        plan.highlighted
                                            ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                                            : ''
                                    }`}
                                >
                                    {plan.highlighted && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            {copy.popular}
                                        </span>
                                    )}
                                    <h3 className="text-xl font-bold text-surface-900">{plan.name}</h3>
                                    <div className="mt-3 mb-5">
                                        <span className="text-3xl font-bold text-emerald-700">{plan.price_label}</span>
                                        <span className="text-sm text-surface-500 block mt-1">
                                            {plan.price_kzt === 0 ? copy.forever : copy.perMonth}
                                        </span>
                                    </div>
                                    <ul className="space-y-2 mb-6 flex-1">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex gap-2 text-sm text-surface-700">
                                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={plan.id === 'free' ? '/register' : '/workspace'}
                                        className={
                                            plan.highlighted
                                                ? 'btn-primary w-full text-center justify-center'
                                                : 'btn-secondary w-full text-center justify-center'
                                        }
                                    >
                                        {plan.price_kzt === 0 ? copy.startFree : copy.choosePlan}
                                        <ArrowRight className="w-4 h-4 ml-2 inline" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                        {paymentNote && (
                            <p className="text-center text-sm text-surface-500 max-w-2xl mx-auto">{paymentNote}</p>
                        )}
                    </ScrollReveal>
                )}
            </div>
        </section>
    );
}
