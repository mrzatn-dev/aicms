'use client';

import { Menu } from 'lucide-react';

import { getSidebarItems } from '../config';
import { getWorkspaceCopy } from '../i18n';
import type { ActiveTab, LocaleCode, UserInfo } from '../types';

interface WorkspaceTopBarProps {
    activeTab: ActiveTab;
    locale: LocaleCode;
    user: UserInfo;
    compactMode: boolean;
    onOpenMobileMenu: () => void;
}

export function WorkspaceTopBar({
    activeTab,
    locale,
    user,
    compactMode,
    onOpenMobileMenu,
}: WorkspaceTopBarProps) {
    const sidebarItems = getSidebarItems(locale);
    const copy = getWorkspaceCopy(locale).topbar;

    return (
        <header
            className={`workspace-topbar sticky top-0 z-20 border-b border-surface-200/60 px-6 flex items-center justify-between ${compactMode ? 'py-2' : 'py-4'}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden p-2 text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="workspace-topbar-title text-2xl text-surface-900 truncate">
                        {sidebarItems.find((item) => item.id === activeTab)?.label || copy.dashboard}
                    </h1>
                    <p className="text-xs text-surface-500 hidden sm:block mt-0.5">
                        {copy.dashboard} · AI CMS
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        user.role === 'admin'
                            ? 'bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                >
                    {user.role === 'admin' ? copy.admin : copy.user}
                </span>
            </div>
        </header>
    );
}
