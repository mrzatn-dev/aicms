'use client';

import { Database, Loader2, RefreshCw, Server, ShieldCheck } from 'lucide-react';

import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import type { LocaleCode, SystemMonitorData } from '../../types';

interface SystemMonitorTabProps {
    locale: LocaleCode;
    loading: boolean;
    monitor: SystemMonitorData | null;
}

const statusClassMap: Record<string, string> = {
    healthy: 'bg-emerald-100 text-emerald-700',
    degraded: 'bg-amber-100 text-amber-700',
    disabled: 'bg-slate-200 text-slate-700',
    missing: 'bg-slate-200 text-slate-700',
    offline: 'bg-rose-100 text-rose-700',
};

export function SystemMonitorTab({ locale, loading, monitor }: SystemMonitorTabProps) {
    const copy = getWorkspaceCopy(locale).monitor;
    const localeTag = getLocaleTag(locale);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-surface-900">{copy.title}</h2>
                <p className="text-surface-500">{copy.subtitle}</p>
            </div>

            {loading ? (
                <div className="card p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : !monitor ? (
                <div className="card p-12 text-center">
                    <Server className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-surface-500">{copy.empty}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.servicesHealthy}</p>
                            </div>
                            <p className="text-3xl font-bold text-surface-900">
                                {monitor.summary.healthy_services}/{monitor.summary.total_services}
                            </p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Server className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.queueBacklog}</p>
                            </div>
                            <p className="text-3xl font-bold text-surface-900">{monitor.summary.queue_backlog}</p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                                    <Database className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.redisState}</p>
                            </div>
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusClassMap[monitor.redis.status] || 'bg-surface-200 text-surface-700'}`}>
                                {copy.statuses[monitor.redis.status] || monitor.redis.status}
                            </span>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-500 flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-sm text-surface-500">{copy.refreshedAt}</p>
                            </div>
                            <p className="text-sm font-semibold text-surface-900">
                                {new Date(monitor.generated_at).toLocaleString(localeTag)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 card p-6">
                            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <Server className="w-5 h-5 text-primary-500" />
                                {copy.serviceHealth}
                            </h3>
                            <div className="space-y-3">
                                {monitor.services.map((service) => (
                                    <div key={service.name} className="rounded-xl border border-surface-200 bg-surface-50/70 p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-surface-900">{service.name}</p>
                                                <p className="text-xs text-surface-500 truncate">{service.url}</p>
                                            </div>
                                            <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-semibold ${statusClassMap[service.status] || 'bg-surface-200 text-surface-700'}`}>
                                                {copy.statuses[service.status] || service.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="px-2.5 py-1 rounded-full bg-white border border-surface-200 text-xs text-surface-600">
                                                {copy.httpStatus}: {service.http_status ?? '—'}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-full bg-white border border-surface-200 text-xs text-surface-600">
                                                {copy.latency}: {service.response_time_ms ?? '—'} ms
                                            </span>
                                        </div>
                                        {service.error && (
                                            <p className="text-xs text-rose-600">{service.error}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <Database className="w-5 h-5 text-cyan-500" />
                                {copy.redisCache}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-surface-500">{copy.host}</span>
                                    <span className="text-sm font-medium text-surface-900">{monitor.redis.host}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-surface-500">{copy.database}</span>
                                    <span className="text-sm font-medium text-surface-900">{monitor.redis.db}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-surface-500">{copy.cacheConnected}</span>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClassMap[monitor.redis.status] || 'bg-surface-200 text-surface-700'}`}>
                                        {copy.statuses[monitor.redis.status] || monitor.redis.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-surface-500">{copy.cacheKeys}</span>
                                    <span className="text-sm font-medium text-surface-900">{monitor.redis.analytics_key_count}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-surface-500">{copy.latency}</span>
                                    <span className="text-sm font-medium text-surface-900">{monitor.redis.latency_ms ?? '—'} ms</span>
                                </div>
                                {monitor.redis.sample_keys.length > 0 && (
                                    <div>
                                        <p className="text-sm text-surface-500 mb-2">{copy.sampleKeys}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {monitor.redis.sample_keys.map((key) => (
                                                <span key={key} className="px-2.5 py-1 rounded-full bg-surface-100 text-xs text-surface-700 border border-surface-200">
                                                    {key}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {monitor.redis.error && (
                                    <p className="text-xs text-rose-600">{monitor.redis.error}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <Server className="w-5 h-5 text-amber-500" />
                                {copy.queues}
                            </h3>
                        <div className="space-y-3">
                            {monitor.queues.map((queue) => (
                                <div key={queue.name} className="rounded-xl border border-surface-200 bg-surface-50/70 p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                                        <p className="text-sm font-semibold text-surface-900">{queue.name}</p>
                                        <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-semibold ${statusClassMap[queue.status] || 'bg-surface-200 text-surface-700'}`}>
                                            {copy.statuses[queue.status] || queue.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        <div className="rounded-lg bg-white border border-surface-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-surface-400">{copy.messages}</p>
                                            <p className="text-lg font-semibold text-surface-900">{queue.messages}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-surface-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-surface-400">{copy.ready}</p>
                                            <p className="text-lg font-semibold text-surface-900">{queue.messages_ready}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-surface-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-surface-400">{copy.unacked}</p>
                                            <p className="text-lg font-semibold text-surface-900">{queue.messages_unacknowledged}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-surface-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-surface-400">{copy.consumers}</p>
                                            <p className="text-lg font-semibold text-surface-900">{queue.consumers}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-surface-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-surface-400">{copy.state}</p>
                                            <p className="text-lg font-semibold text-surface-900">{queue.state}</p>
                                        </div>
                                    </div>
                                    {queue.error && (
                                        <p className="text-xs text-rose-600 mt-3">{queue.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
