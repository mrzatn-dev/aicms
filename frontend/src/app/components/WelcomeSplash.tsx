'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { LocaleCode } from '@/app/i18n';

const MESSAGES: Record<LocaleCode, { title: string; subtitle: string; cta: string }> = {
    ru: {
        title: 'Добро пожаловать',
        subtitle: 'Платформа AI-инструментов для умного контента',
        cta: 'Начать',
    },
    en: {
        title: 'Welcome',
        subtitle: 'AI-powered tools for intelligent content',
        cta: 'Get started',
    },
    kk: {
        title: 'Қош келдіңіз',
        subtitle: 'Ақылды контент үшін AI құралдары',
        cta: 'Бастау',
    },
};

type WelcomeSplashProps = {
    locale?: LocaleCode;
};

export default function WelcomeSplash({ locale = 'ru' }: WelcomeSplashProps) {
    const [show, setShow] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const seen = sessionStorage.getItem('welcome_seen');
        if (!seen) {
            setShow(true);
            document.body.classList.add('welcome-open');
        }
    }, []);

    const dismiss = () => {
        setLeaving(true);
        sessionStorage.setItem('welcome_seen', '1');
        document.body.classList.remove('welcome-open');
        setTimeout(() => setShow(false), 520);
    };

    if (!show) return null;

    const copy = MESSAGES[locale] ?? MESSAGES.ru;

    return (
        <div
            className={`welcome-splash ${leaving ? 'welcome-splash--leave' : ''}`}
            role="dialog"
            aria-label={copy.title}
        >
            <div className="welcome-splash__backdrop" onClick={dismiss} aria-hidden />
            <div className="welcome-splash__card">
                <button
                    type="button"
                    className="welcome-splash__close"
                    onClick={dismiss}
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="welcome-splash__orb welcome-splash__orb--1" />
                <div className="welcome-splash__orb welcome-splash__orb--2" />

                <div className="welcome-splash__icon">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>

                <h2 className="welcome-splash__title font-display">{copy.title}</h2>
                <p className="welcome-splash__subtitle">{copy.subtitle}</p>

                <div className="welcome-splash__dots">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="welcome-splash__dot" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>

                <button type="button" className="welcome-splash__cta" onClick={dismiss}>
                    {copy.cta}
                </button>
            </div>
        </div>
    );
}
