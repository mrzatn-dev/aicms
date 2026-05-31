'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

import type { LocaleCode } from '../types';

const STORAGE_KEY = 'workspace_welcome_seen';

const TIPS: Record<LocaleCode, { title: string; hint: string }> = {
    ru: {
        title: 'Подсказка',
        hint: 'Начните с AI Чата или загрузите документ — результаты сохранятся в истории.',
    },
    en: {
        title: 'Tip',
        hint: 'Start with AI Chat or upload a document — results are saved to your history.',
    },
    kk: {
        title: 'Кеңес',
        hint: 'AI чаттан бастаңыз немесе құжат жүктеңіз — нәтижелер тарихта сақталады.',
    },
};

type WorkspaceWelcomeBannerProps = {
    locale: LocaleCode;
};

export function WorkspaceWelcomeBanner({ locale }: WorkspaceWelcomeBannerProps) {
    const [visible, setVisible] = useState(false);
    const copy = TIPS[locale] ?? TIPS.ru;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!sessionStorage.getItem(STORAGE_KEY)) {
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="workspace-welcome-card rounded-2xl px-4 py-3 mb-6 animate-fade-in relative flex items-center gap-3">
            <div className="workspace-welcome-card__orb workspace-welcome-card__orb--1" style={{ width: 120, height: 120, top: -40, right: -20 }} />
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0 relative z-10">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">{copy.title}</p>
                <p className="text-sm text-surface-700 dark:text-slate-300">{copy.hint}</p>
            </div>
            <button
                type="button"
                onClick={dismiss}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-white/60 dark:hover:bg-surface-800/60 transition-colors relative z-10 flex-shrink-0"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
