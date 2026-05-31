'use client';

import { Bot, CheckCircle2, Crown, Sparkles, Zap } from 'lucide-react';

import { getQuickActions } from '../../config';
import { getWorkspaceCopy } from '../../i18n';
import { WorkspaceWelcomeBanner } from '../WorkspaceWelcomeBanner';
import type { ActiveTab, LocaleCode, UserInfo } from '../../types';

interface HomeTabProps {
    locale: LocaleCode;
    user: UserInfo;
    onTabChange: (tab: ActiveTab) => void;
}

export function HomeTab({ locale, user, onTabChange }: HomeTabProps) {
    const copy = getWorkspaceCopy(locale).home;
    const quickActions = getQuickActions(locale);
    const displayName = user.full_name || user.username;

    return (
        <div className="space-y-8 animate-fade-in">
            <WorkspaceWelcomeBanner locale={locale} />

            <div className="workspace-welcome-card rounded-2xl p-8 relative overflow-hidden">
                <div className="workspace-welcome-card__orb workspace-welcome-card__orb--1" />
                <div className="workspace-welcome-card__orb workspace-welcome-card__orb--2" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-surface-900 mb-2 workspace-topbar-title">
                            {copy.welcome.replace('{name}', displayName)}
                        </h2>
                        <p className="text-surface-700/70 max-w-xl leading-relaxed">{copy.subtitle}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center shadow-xl shadow-emerald-500/25 flex-shrink-0 animate-float hidden sm:flex">
                        <Crown className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    {copy.quickAccess}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                        <button
                            key={action.id}
                            type="button"
                            onClick={() => onTabChange(action.id)}
                            className="workspace-quick-action p-5 rounded-2xl border border-surface-200/60 group text-left bg-white dark:bg-surface-900"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}
                            >
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-surface-900">{action.title}</p>
                            <p className="text-sm text-surface-500 mt-1">{action.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="workspace-stat-card card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-surface-900">{quickActions.length}</p>
                        <p className="text-sm text-surface-500">{copy.aiTools}</p>
                    </div>
                </div>
                <div className="workspace-stat-card card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm text-surface-500">{copy.status}</p>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {copy.active}
                        </p>
                    </div>
                </div>
                <div className="workspace-stat-card card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm text-surface-500">{copy.aiModel}</p>
                        <p className="font-medium text-surface-900">DeepSeek</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
