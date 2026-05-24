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
        <header className={`sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-surface-200/60 px-6 flex items-center justify-between ${compactMode ? 'py-2' : 'py-4'}`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden p-2 text-surface-700 hover:bg-surface-100 rounded-lg"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-surface-900">
                    {sidebarItems.find((item) => item.id === activeTab)?.label || copy.dashboard}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${user.role === 'admin' ? 'bg-violet-50 text-violet-700' : 'bg-primary-50 text-primary-700'}`}>
                    {user.role === 'admin' ? copy.admin : copy.user}
                </span>
            </div>
        </header>
    );
}
