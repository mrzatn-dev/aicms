import {
    AudioLines,
    Bot,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Headset,
    History,
    Image as ImageIcon,
    LayoutDashboard,
    MessageSquare,
    PieChart,
    Server,
    Settings as SettingsIcon,
    User,
} from 'lucide-react';

import { getWorkspaceCopy } from './i18n';
import type { LocaleCode, QuickAction, SidebarItem } from './types';

export const getSidebarItems = (locale: LocaleCode): SidebarItem[] => {
    const copy = getWorkspaceCopy(locale);
    return [
        { id: 'home', label: copy.sidebar.home, icon: LayoutDashboard, gradient: 'from-primary-500 to-violet-500', category: 'main' },
        { id: 'profile', label: copy.sidebar.profile, icon: User, gradient: 'from-emerald-500 to-teal-500', category: 'main' },
        { id: 'history', label: copy.sidebar.history, icon: History, gradient: 'from-amber-500 to-yellow-500', category: 'main' },
        { id: 'settings', label: copy.sidebar.settings, icon: SettingsIcon, gradient: 'from-slate-500 to-gray-500', category: 'main' },
        { id: 'statistics', label: copy.sidebar.statistics, icon: PieChart, gradient: 'from-rose-500 to-pink-500', category: 'main' },
        { id: 'system_monitor', label: copy.sidebar.system_monitor, icon: Server, gradient: 'from-slate-700 to-slate-500', category: 'main' },
        { id: 'support', label: copy.sidebar.support, icon: Headset, gradient: 'from-sky-500 to-cyan-500', category: 'main' },
        { id: 'support_admin', label: copy.sidebar.support_admin, icon: Headset, gradient: 'from-fuchsia-500 to-violet-500', category: 'main' },
        { id: 'chat', label: copy.sidebar.chat, icon: MessageSquare, gradient: 'from-emerald-500 to-green-500', category: 'ai' },
        { id: 'validate', label: copy.sidebar.validate, icon: FileCheck, gradient: 'from-amber-500 to-orange-500', category: 'ai' },
        { id: 'document', label: copy.sidebar.document, icon: FileText, gradient: 'from-indigo-500 to-violet-500', category: 'ai' },
        { id: 'csv', label: copy.sidebar.csv, icon: FileSpreadsheet, gradient: 'from-rose-500 to-pink-500', category: 'ai' },
        { id: 'image', label: copy.sidebar.image, icon: ImageIcon, gradient: 'from-cyan-500 to-blue-500', category: 'ai' },
        { id: 'audio', label: copy.sidebar.audio, icon: AudioLines, gradient: 'from-teal-500 to-emerald-500', category: 'ai' },
    ];
};

export const getQuickActions = (locale: LocaleCode): QuickAction[] => {
    const copy = getWorkspaceCopy(locale);
    return [
        { id: 'chat', title: copy.quickActions.chat.title, desc: copy.quickActions.chat.desc, icon: MessageSquare, color: 'from-emerald-500 to-green-500' },
        { id: 'validate', title: copy.quickActions.validate.title, desc: copy.quickActions.validate.desc, icon: FileCheck, color: 'from-amber-500 to-orange-500' },
        { id: 'document', title: copy.quickActions.document.title, desc: copy.quickActions.document.desc, icon: FileText, color: 'from-indigo-500 to-violet-500' },
        { id: 'csv', title: copy.quickActions.csv.title, desc: copy.quickActions.csv.desc, icon: FileSpreadsheet, color: 'from-rose-500 to-pink-500' },
        { id: 'image', title: copy.quickActions.image.title, desc: copy.quickActions.image.desc, icon: ImageIcon, color: 'from-cyan-500 to-blue-500' },
        { id: 'audio', title: copy.quickActions.audio.title, desc: copy.quickActions.audio.desc, icon: AudioLines, color: 'from-teal-500 to-emerald-500' },
    ];
};

export const fontSizeMap: Record<string, string> = {
    sm: '14px',
    md: '16px',
    lg: '18px',
};

export const getInitialChatMessages = (locale: LocaleCode) => {
    const messages: Record<LocaleCode, string> = {
        ru: 'Привет! Я AI-ассистент CMS. Чем могу помочь?',
        en: 'Hi! I am the CMS AI assistant. How can I help?',
        kk: 'Сәлем! Мен CMS AI көмекшісімін. Қалай көмектесе аламын?',
    };

    return [
        { role: 'assistant' as const, content: messages[locale] || messages.ru, timestamp: new Date() },
    ];
};
