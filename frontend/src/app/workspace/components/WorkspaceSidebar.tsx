'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, LogOut, Sparkles, X } from 'lucide-react';

import { getSidebarItems } from '../config';
import type { ActiveTab, LocaleCode, UserInfo } from '../types';

interface WorkspaceSidebarProps {
    user: UserInfo;
    locale: LocaleCode;
    activeTab: ActiveTab;
    sidebarOpen: boolean;
    mobileMenuOpen: boolean;
    supportUnreadCount: number;
    supportAdminUnreadCount: number;
    onTabChange: (tab: ActiveTab) => void;
    onToggleSidebar: () => void;
    onCloseMobileMenu: () => void;
    onLogout: () => void;
}

export function WorkspaceSidebar({
    user,
    locale,
    activeTab,
    sidebarOpen,
    mobileMenuOpen,
    supportUnreadCount,
    supportAdminUnreadCount,
    onTabChange,
    onToggleSidebar,
    onCloseMobileMenu,
    onLogout,
}: WorkspaceSidebarProps) {
    const sidebarItems = getSidebarItems(locale);

    return (
        <aside
            className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-surface-200/60 z-40 flex flex-col transition-all duration-300 ease-in-out ${
                sidebarOpen ? 'w-72' : 'w-20'
            } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            <div className="p-4 border-b border-surface-200/60 flex items-center justify-between">
                <Link href="/" className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center w-full'}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    {sidebarOpen && (
                        <span className="text-xl font-bold text-surface-900">AI<span className="text-primary-600">CMS</span></span>
                    )}
                </Link>
                <button
                    onClick={onToggleSidebar}
                    className="hidden lg:flex p-1.5 text-surface-700/40 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                >
                    {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <button
                    onClick={onCloseMobileMenu}
                    className="lg:hidden p-1.5 text-surface-700/40 hover:text-surface-900"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {sidebarOpen && (
                    <p className="text-xs font-medium text-surface-700/40 uppercase tracking-wider px-3 mb-2">Основное</p>
                )}
                {sidebarItems.filter((item) => item.category === 'main').map((item) => {
                    if ((item.id === 'support_admin' || item.id === 'system_monitor') && user.role !== 'admin') {
                        return null;
                    }
                    const isActive = activeTab === item.id;
                    const unreadCount = item.id === 'support'
                        ? supportUnreadCount
                        : item.id === 'support_admin'
                            ? supportAdminUnreadCount
                            : 0;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { onTabChange(item.id); onCloseMobileMenu(); }}
                            className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                                    : 'text-surface-700/70 hover:bg-surface-100 hover:text-surface-900'
                            } ${!sidebarOpen && 'justify-center'}`}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isActive ? `bg-gradient-to-br ${item.gradient} shadow-md` : 'bg-surface-100'
                            }`}>
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-surface-700/60'}`} />
                            </div>
                            {sidebarOpen && <span>{item.label}</span>}
                            {unreadCount > 0 && (
                                <span
                                    className={`flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-semibold ml-auto ${
                                        isActive ? 'bg-primary-600 text-white' : 'bg-rose-500 text-white'
                                    } ${!sidebarOpen ? 'absolute top-2 right-2 min-w-[20px] h-5 px-1.5' : ''}`}
                                >
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    );
                })}

                {sidebarOpen && <hr className="my-4 border-surface-200/60" />}
                {sidebarOpen && (
                    <p className="text-xs font-medium text-surface-700/40 uppercase tracking-wider px-3 mb-2">AI Инструменты</p>
                )}
                {sidebarItems.filter((item) => item.category === 'ai').map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { onTabChange(item.id); onCloseMobileMenu(); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                                    : 'text-surface-700/70 hover:bg-surface-100 hover:text-surface-900'
                            } ${!sidebarOpen && 'justify-center'}`}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isActive ? `bg-gradient-to-br ${item.gradient} shadow-md` : 'bg-surface-100'
                            }`}>
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-surface-700/60'}`} />
                            </div>
                            {sidebarOpen && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-surface-200/60">
                <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                            {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </span>
                    </div>
                    {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">{user.full_name || user.username}</p>
                            <p className="text-xs text-surface-700/50 truncate">{user.email}</p>
                        </div>
                    )}
                    {sidebarOpen && (
                        <button onClick={onLogout} className="p-1.5 text-surface-700/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all" title="Выйти">
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
