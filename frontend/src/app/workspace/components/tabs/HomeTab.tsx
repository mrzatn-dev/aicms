'use client';

import { Bot, CheckCircle2, Crown, Sparkles, Zap } from 'lucide-react';

import { getQuickActions } from '../../config';
import { getWorkspaceCopy } from '../../i18n';
import type { ActiveTab, LocaleCode, UserInfo } from '../../types';

interface HomeTabProps {
    locale: LocaleCode;
    user: UserInfo;
    onTabChange: (tab: ActiveTab) => void;
}

export function HomeTab({ locale, user, onTabChange }: HomeTabProps) {
    const copy = getWorkspaceCopy(locale).home;
    const quickActions = getQuickActions(locale);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="card p-8 bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-surface-900 mb-2">
                            {copy.welcome.replace('{name}', user.full_name || user.username)}
                        </h2>
                        <p className="text-surface-700/70 max-w-xl">
                            {copy.subtitle}
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-lg">
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
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => onTabChange(action.id)}
                            className="p-5 rounded-xl border border-surface-200/60 hover:border-primary-300 hover:shadow-md transition-all group text-left bg-white"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-surface-900">{action.title}</p>
                            <p className="text-sm text-surface-500 mt-1">{action.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-surface-900">7</p>
                        <p className="text-sm text-surface-500">{copy.aiTools}</p>
                    </div>
                </div>
                <div className="card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm text-surface-500">{copy.status}</p>
                        <p className="font-medium text-emerald-600">{copy.active}</p>
                    </div>
                </div>
                <div className="card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-600" />
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
