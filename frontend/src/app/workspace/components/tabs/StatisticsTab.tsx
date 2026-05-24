'use client';

import { Activity, BarChart3, Calendar, History, Loader2, PieChart, Zap } from 'lucide-react';

import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import { formatToolType } from '../../utils';
import type { AnalyticsLogItem, LocaleCode, StatisticsData, UserInfo } from '../../types';

interface StatisticsTabProps {
    locale: LocaleCode;
    user: UserInfo;
    statsLoading: boolean;
    statistics: StatisticsData | null;
    activityLoading: boolean;
    activityItems: AnalyticsLogItem[];
}

const levelClassMap: Record<string, string> = {
    info: 'bg-sky-100 text-sky-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
};

export function StatisticsTab({
    locale,
    user,
    statsLoading,
    statistics,
    activityLoading,
    activityItems,
}: StatisticsTabProps) {
    const copy = getWorkspaceCopy(locale).statistics;
    const localeTag = getLocaleTag(locale);

    return (
        <div className="space-y-6 animate-fade-in">
            {statsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : !statistics ? (
                <div className="card p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-surface-500">{copy.empty}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.total}</p>
                            </div>
                            <p className="text-3xl font-bold text-surface-900">{statistics.total_analyses || 0}</p>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.week}</p>
                            </div>
                            <p className="text-3xl font-bold text-surface-900">{statistics.analyses_this_week || 0}</p>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.month}</p>
                            </div>
                            <p className="text-3xl font-bold text-surface-900">{statistics.analyses_this_month || 0}</p>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.favorite}</p>
                            </div>
                            <p className="text-lg font-bold text-surface-900">{statistics.most_used_tool ? formatToolType(statistics.most_used_tool, locale) : '—'}</p>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-primary-500" />
                            {copy.usage}
                        </h3>
                        {statistics.analyses_by_tool?.length ? (
                            <div className="space-y-3">
                                {statistics.analyses_by_tool.map((tool) => (
                                    <div key={tool.tool_type} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-surface-700">{formatToolType(tool.tool_type, locale)}</span>
                                                <span className="text-sm text-surface-500">{tool.count} {copy.times}</span>
                                            </div>
                                            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                                                    style={{ width: `${Math.min(100, (tool.count / (statistics.total_analyses || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-surface-500 text-center py-4">{copy.noUsage}</p>
                        )}
                    </div>

                    {statistics.recent_activity?.length ? (
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-amber-500" />
                                {copy.recent}
                            </h3>
                            <div className="space-y-3">
                                {statistics.recent_activity.slice(0, 5).map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-surface-900">{formatToolType(activity.tool_type, locale)}</p>
                                            <p className="text-xs text-surface-400">{activity.title || copy.untitled}</p>
                                        </div>
                                        <p className="text-xs text-surface-400">{new Date(activity.created_at).toLocaleDateString(localeTag)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {user.role === 'admin' && (
                        <div className="card p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-surface-900">{copy.liveTitle}</h3>
                                    <p className="text-sm text-surface-500">{copy.liveSubtitle}</p>
                                </div>
                            </div>

                            {activityLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                                </div>
                            ) : activityItems.length === 0 ? (
                                <p className="text-surface-500 text-center py-6">{copy.noLive}</p>
                            ) : (
                                <div className="space-y-3">
                                    {activityItems.map((item) => (
                                        <div key={item.id} className="p-4 rounded-xl border border-surface-200 bg-surface-50/70">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-surface-900 truncate">{item.message}</p>
                                                    <p className="text-xs text-surface-500 mt-1">{item.service}</p>
                                                </div>
                                                <span className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap ${levelClassMap[item.level] || 'bg-surface-200 text-surface-700'}`}>
                                                    {copy.level}: {item.level}
                                                </span>
                                            </div>
                                            {item.details && Object.keys(item.details).length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {Object.entries(item.details).slice(0, 4).map(([key, value]) => (
                                                        <span key={key} className="px-2.5 py-1 rounded-full bg-white text-xs text-surface-600 border border-surface-200">
                                                            {key}: {String(value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-surface-400">
                                                {new Date(item.created_at).toLocaleString(localeTag)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
