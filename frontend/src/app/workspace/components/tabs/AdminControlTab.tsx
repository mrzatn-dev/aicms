'use client';

import { Activity, Bot, CheckCircle2, FileArchive, Loader2, RefreshCw, Shield, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';

import { getLocaleTag } from '../../i18n';
import { formatToolType } from '../../utils';
import type { AdminFileItem, AdminOverviewData, AdminUserItem, LocaleCode, UserInfo } from '../../types';

interface AdminControlTabProps {
    locale: LocaleCode;
    currentUser: UserInfo;
    loading: boolean;
    usersLoading: boolean;
    filesLoading: boolean;
    overview: AdminOverviewData | null;
    users: AdminUserItem[];
    usersTotal: number;
    files: AdminFileItem[];
    filesTotal: number;
    userSearch: string;
    fileSearch: string;
    userRoleFilter: string;
    fileToolFilter: string;
    onUserSearchChange: (value: string) => void;
    onFileSearchChange: (value: string) => void;
    onUserRoleFilterChange: (value: string) => void;
    onFileToolFilterChange: (value: string) => void;
    onRefresh: () => void;
    onUpdateUser: (userId: string, data: { role?: string; is_active?: boolean }) => void;
    onDeleteUser: (userId: string) => void;
}

const labels = {
    ru: {
        title: 'Полный контроль системы',
        subtitle: 'Пользователи, загруженные файлы, AI-анализы и системные риски',
        users: 'Пользователи',
        active: 'Активные',
        admins: 'Админы',
        analyses: 'AI анализы',
        files: 'Файлы',
        support: 'Открытая поддержка',
        insights: 'AI-инсайты',
        userRegistry: 'Пользователи системы',
        fileRegistry: 'Загруженные файлы',
        searchUsers: 'Поиск по имени, email или username',
        searchFiles: 'Поиск по файлам',
        allRoles: 'Все роли',
        allTools: 'Все инструменты',
        role: 'Роль',
        status: 'Статус',
        activity: 'Активность',
        created: 'Создан',
        activeStatus: 'Активен',
        blockedStatus: 'Отключен',
        makeAdmin: 'Сделать админом',
        makeUser: 'Сделать пользователем',
        block: 'Отключить',
        unblock: 'Включить',
        delete: 'Удалить',
        owner: 'Владелец',
        characteristics: 'Характеристики',
        recommendations: 'Рекомендации',
        warnings: 'Предупреждения',
        empty: 'Данных пока нет',
    },
    en: {
        title: 'Full System Control',
        subtitle: 'Users, uploaded files, AI analyses, and system risks',
        users: 'Users',
        active: 'Active',
        admins: 'Admins',
        analyses: 'AI analyses',
        files: 'Files',
        support: 'Open support',
        insights: 'AI insights',
        userRegistry: 'System users',
        fileRegistry: 'Uploaded files',
        searchUsers: 'Search name, email, or username',
        searchFiles: 'Search files',
        allRoles: 'All roles',
        allTools: 'All tools',
        role: 'Role',
        status: 'Status',
        activity: 'Activity',
        created: 'Created',
        activeStatus: 'Active',
        blockedStatus: 'Disabled',
        makeAdmin: 'Make admin',
        makeUser: 'Make user',
        block: 'Disable',
        unblock: 'Enable',
        delete: 'Delete',
        owner: 'Owner',
        characteristics: 'Characteristics',
        recommendations: 'Recommendations',
        warnings: 'Warnings',
        empty: 'No data yet',
    },
    kk: {
        title: 'Жүйені толық басқару',
        subtitle: 'Пайдаланушылар, жүктелген файлдар, AI талдаулар және жүйелік тәуекелдер',
        users: 'Пайдаланушылар',
        active: 'Белсенді',
        admins: 'Админдер',
        analyses: 'AI талдаулар',
        files: 'Файлдар',
        support: 'Ашық қолдау',
        insights: 'AI инсайттар',
        userRegistry: 'Жүйе пайдаланушылары',
        fileRegistry: 'Жүктелген файлдар',
        searchUsers: 'Аты, email немесе username бойынша іздеу',
        searchFiles: 'Файлдарды іздеу',
        allRoles: 'Барлық рөлдер',
        allTools: 'Барлық құралдар',
        role: 'Рөл',
        status: 'Күй',
        activity: 'Белсенділік',
        created: 'Құрылған',
        activeStatus: 'Белсенді',
        blockedStatus: 'Өшірілген',
        makeAdmin: 'Админ ету',
        makeUser: 'Пайдаланушы ету',
        block: 'Өшіру',
        unblock: 'Қосу',
        delete: 'Жою',
        owner: 'Иесі',
        characteristics: 'Сипаттамалар',
        recommendations: 'Ұсыныстар',
        warnings: 'Ескертулер',
        empty: 'Әзірге дерек жоқ',
    },
};

const toolFilters = ['all', 'document_analysis', 'csv_analysis', 'image_analysis', 'audio_transcription'];

function formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value ?? '—');
}

export function AdminControlTab({
    locale,
    currentUser,
    loading,
    usersLoading,
    filesLoading,
    overview,
    users,
    usersTotal,
    files,
    filesTotal,
    userSearch,
    fileSearch,
    userRoleFilter,
    fileToolFilter,
    onUserSearchChange,
    onFileSearchChange,
    onUserRoleFilterChange,
    onFileToolFilterChange,
    onRefresh,
    onUpdateUser,
    onDeleteUser,
}: AdminControlTabProps) {
    const copy = labels[locale] || labels.ru;
    const localeTag = getLocaleTag(locale);
    const totals = overview?.totals || {};

    const stats = [
        { label: copy.users, value: totals.users || usersTotal || 0, icon: Users, color: 'from-sky-500 to-cyan-500' },
        { label: copy.active, value: totals.active_users || 0, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
        { label: copy.admins, value: totals.admins || 0, icon: ShieldCheck, color: 'from-red-500 to-orange-500' },
        { label: copy.analyses, value: totals.analyses || 0, icon: Bot, color: 'from-indigo-500 to-violet-500' },
        { label: copy.files, value: totals.files || filesTotal || 0, icon: FileArchive, color: 'from-amber-500 to-yellow-500' },
        { label: copy.support, value: totals.support_open || 0, icon: Activity, color: 'from-rose-500 to-pink-500' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-surface-900">{copy.title}</h2>
                    <p className="text-sm text-surface-500 mt-1">{copy.subtitle}</p>
                </div>
                <button onClick={onRefresh} className="btn-secondary inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                        {stats.map((stat) => (
                            <div key={stat.label} className="card p-5">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-surface-900 mt-1">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 flex items-center gap-2 mb-4">
                            <Bot className="w-5 h-5 text-indigo-500" />
                            {copy.insights}
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {(overview?.ai_insights?.length ? overview.ai_insights : [copy.empty]).map((insight) => (
                                <div key={insight} className="p-4 rounded-xl bg-indigo-50 text-sm text-indigo-900">
                                    {insight}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
                                    <UserCog className="w-5 h-5 text-red-500" />
                                    {copy.userRegistry}
                                </h3>
                                <p className="text-sm text-surface-500">{usersTotal} total</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    value={userSearch}
                                    onChange={(event) => onUserSearchChange(event.target.value)}
                                    className="input-field min-w-[260px]"
                                    placeholder={copy.searchUsers}
                                />
                                <select value={userRoleFilter} onChange={(event) => onUserRoleFilterChange(event.target.value)} className="input-field">
                                    <option value="all">{copy.allRoles}</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                            </div>
                        </div>

                        {usersLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
                        ) : users.length === 0 ? (
                            <p className="text-center text-surface-500 py-8">{copy.empty}</p>
                        ) : (
                            <div className="space-y-3">
                                {users.map((item) => {
                                    const isSelf = item.id === currentUser.id;
                                    return (
                                        <div key={item.id} className="p-4 rounded-xl border border-surface-200 bg-surface-50/70">
                                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-surface-900">{item.full_name || item.username}</p>
                                                        <span className="px-2 py-0.5 rounded-full bg-white border border-surface-200 text-xs text-surface-600">@{item.username}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>
                                                            {item.role}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-600'}`}>
                                                            {item.is_active ? copy.activeStatus : copy.blockedStatus}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-surface-500 mt-1">{item.email}</p>
                                                    <div className="flex flex-wrap gap-2 mt-3 text-xs text-surface-500">
                                                        <span>{copy.activity}: {item.analyses_count} AI / {item.files_count} files</span>
                                                        <span>{copy.created}: {new Date(item.created_at).toLocaleDateString(localeTag)}</span>
                                                        {item.last_activity_at && <span>Last: {new Date(item.last_activity_at).toLocaleString(localeTag)}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        disabled={isSelf}
                                                        onClick={() => onUpdateUser(item.id, { role: item.role === 'admin' ? 'user' : 'admin' })}
                                                        className="btn-secondary text-sm !px-3 !py-2 disabled:opacity-50"
                                                    >
                                                        {item.role === 'admin' ? copy.makeUser : copy.makeAdmin}
                                                    </button>
                                                    <button
                                                        disabled={isSelf}
                                                        onClick={() => onUpdateUser(item.id, { is_active: !item.is_active })}
                                                        className="btn-secondary text-sm !px-3 !py-2 disabled:opacity-50"
                                                    >
                                                        {item.is_active ? copy.block : copy.unblock}
                                                    </button>
                                                    <button
                                                        disabled={isSelf}
                                                        onClick={() => onDeleteUser(item.id)}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                                                        title={copy.delete}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="card p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
                                    <FileArchive className="w-5 h-5 text-amber-500" />
                                    {copy.fileRegistry}
                                </h3>
                                <p className="text-sm text-surface-500">{filesTotal} total</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    value={fileSearch}
                                    onChange={(event) => onFileSearchChange(event.target.value)}
                                    className="input-field min-w-[260px]"
                                    placeholder={copy.searchFiles}
                                />
                                <select value={fileToolFilter} onChange={(event) => onFileToolFilterChange(event.target.value)} className="input-field">
                                    {toolFilters.map((tool) => (
                                        <option key={tool} value={tool}>{tool === 'all' ? copy.allTools : formatToolType(tool, locale)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filesLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
                        ) : files.length === 0 ? (
                            <p className="text-center text-surface-500 py-8">{copy.empty}</p>
                        ) : (
                            <div className="space-y-4">
                                {files.map((item) => (
                                    <div key={item.id} className="p-4 rounded-xl border border-surface-200 bg-surface-50/70">
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-surface-900 break-all">{item.filename}</p>
                                                    <span className="px-2 py-0.5 rounded-full bg-white border border-surface-200 text-xs text-surface-600">
                                                        {formatToolType(item.tool_type, locale)}
                                                    </span>
                                                    {item.file_size_kb ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
                                                            {item.file_size_kb.toFixed(1)} KB
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-surface-500 mt-1">
                                                    {copy.owner}: {item.user_name || item.user_email || item.user_id} • {new Date(item.created_at).toLocaleString(localeTag)}
                                                </p>
                                                {item.ai_summary && (
                                                    <p className="text-sm text-surface-700 mt-3 leading-relaxed">{item.ai_summary}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Shield className={`w-4 h-4 ${item.security_verdict?.verdict === 'safe' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                                <span className="text-surface-500">{String(item.security_verdict?.verdict || 'checked')}</span>
                                            </div>
                                        </div>

                                        {Object.keys(item.characteristics || {}).length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-semibold uppercase text-surface-400 mb-2">{copy.characteristics}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(item.characteristics).slice(0, 8).map(([key, value]) => (
                                                        <span key={key} className="px-2.5 py-1 rounded-full bg-white text-xs text-surface-600 border border-surface-200">
                                                            {key}: {formatValue(value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {item.ai_recommendations?.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-semibold uppercase text-surface-400 mb-2">{copy.recommendations}</p>
                                                <div className="space-y-1">
                                                    {item.ai_recommendations.slice(0, 3).map((recommendation) => (
                                                        <p key={recommendation} className="text-sm text-surface-600">• {recommendation}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {item.warnings?.length > 0 && (
                                            <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                                                {copy.warnings}: {item.warnings.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
