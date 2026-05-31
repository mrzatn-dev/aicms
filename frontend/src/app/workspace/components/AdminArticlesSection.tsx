'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Newspaper, XCircle } from 'lucide-react';

import { contentApi, type Article } from '@/lib/content';
import { showToast } from './ToastHost';
import { statusLabel } from '../articles-i18n';
import { getLocaleTag } from '../i18n';
import type { LocaleCode } from '../types';

const COPY = {
    ru: {
        title: 'Модерация статей',
        subtitle: 'Очередь на публикацию и управление статусами',
        filterAll: 'Все',
        filterQueue: 'В очереди',
        filterPending: 'На модерации',
        filterPublished: 'Опубликованные',
        filterRejected: 'Отклонённые',
        publish: 'Опубликовать',
        reject: 'Отклонить',
        open: 'Открыть',
        empty: 'Нет статей в этой категории',
        loading: 'Загрузка…',
    },
    en: {
        title: 'Article moderation',
        subtitle: 'Publication queue and status management',
        filterAll: 'All',
        filterQueue: 'In queue',
        filterPending: 'Pending',
        filterPublished: 'Published',
        filterRejected: 'Rejected',
        publish: 'Publish',
        reject: 'Reject',
        open: 'Open',
        empty: 'No articles in this filter',
        loading: 'Loading…',
    },
    kk: {
        title: 'Мақалаларды модерациялау',
        subtitle: 'Жариялау кезегі және күйді басқару',
        filterAll: 'Барлығы',
        filterQueue: 'Кезекте',
        filterPending: 'Модерацияда',
        filterPublished: 'Жарияланған',
        filterRejected: 'Қабылданбаған',
        publish: 'Жариялау',
        reject: 'Қабылдамау',
        open: 'Ашу',
        empty: 'Бұл сүзгіде мақала жоқ',
        loading: 'Жүктелуде…',
    },
};

type FilterKey = 'all' | 'queue' | 'pending' | 'published' | 'rejected';

interface AdminArticlesSectionProps {
    locale: LocaleCode;
}

export function AdminArticlesSection({ locale }: AdminArticlesSectionProps) {
    const copy = COPY[locale] ?? COPY.ru;
    const localeTag = getLocaleTag(locale);

    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('queue');
    const [actionId, setActionId] = useState<string | null>(null);

    const loadArticles = useCallback(async () => {
        setLoading(true);
        try {
            const statusesForQueue = ['pending', 'validating', 'analyzing'];
            if (filter === 'queue') {
                const batches = await Promise.all(
                    statusesForQueue.map((status) =>
                        contentApi.listAdmin({ status, page_size: 30 }),
                    ),
                );
                const merged = batches.flatMap((b) => b.items);
                merged.sort(
                    (a, b) =>
                        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
                );
                setArticles(merged);
            } else {
                const status =
                    filter === 'all'
                        ? undefined
                        : filter === 'pending'
                          ? 'pending'
                          : filter;
                const res = await contentApi.listAdmin({
                    status,
                    page_size: 50,
                });
                setArticles(res.items);
            }
        } catch {
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        void loadArticles();
    }, [loadArticles]);

    const hasProcessing = articles.some((a) =>
        ['validating', 'analyzing', 'pending'].includes(a.status),
    );

    useEffect(() => {
        if (!hasProcessing || filter === 'published' || filter === 'rejected') return;
        const timer = window.setInterval(() => void loadArticles(), 6000);
        return () => window.clearInterval(timer);
    }, [hasProcessing, filter, loadArticles]);

    const setStatus = async (id: string, newStatus: string) => {
        setActionId(id);
        try {
            await contentApi.updateStatus(id, newStatus);
            showToast(
                newStatus === 'published'
                    ? locale === 'en'
                        ? 'Article published'
                        : 'Статья опубликована'
                    : locale === 'en'
                      ? 'Article rejected'
                      : 'Статья отклонена',
                'success',
            );
            await loadArticles();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Error', 'error');
        } finally {
            setActionId(null);
        }
    };

    const filters: { key: FilterKey; label: string }[] = [
        { key: 'queue', label: copy.filterQueue },
        { key: 'pending', label: copy.filterPending },
        { key: 'published', label: copy.filterPublished },
        { key: 'rejected', label: copy.filterRejected },
        { key: 'all', label: copy.filterAll },
    ];

    return (
        <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-surface-900">{copy.title}</h3>
                    <p className="text-sm text-surface-500">{copy.subtitle}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            filter === f.key
                                ? 'bg-violet-600 text-white'
                                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : articles.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-6">{copy.empty}</p>
            ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {articles.map((article) => {
                        const busy = actionId === article.id;
                        const canModerate = ['pending', 'validating', 'analyzing'].includes(
                            article.status,
                        );
                        return (
                            <div
                                key={article.id}
                                className="p-4 rounded-xl border border-surface-200 bg-surface-50/50"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                                    <div className="min-w-0">
                                        <p className="font-medium text-surface-900 truncate">
                                            {article.title}
                                        </p>
                                        <p className="text-xs text-surface-500 mt-1">
                                            {statusLabel(locale, article.status)} ·{' '}
                                            {new Date(article.updated_at).toLocaleString(localeTag)}
                                        </p>
                                        {article.ai_analysis?.quality_score != null && (
                                            <p className="text-xs text-emerald-600 mt-1">
                                                Quality:{' '}
                                                {Math.round(article.ai_analysis.quality_score * 100)}%
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {article.status === 'published' && (
                                            <Link
                                                href={`/articles/${article.id}`}
                                                target="_blank"
                                                className="text-xs btn-secondary !py-1.5 inline-flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {copy.open}
                                            </Link>
                                        )}
                                        {canModerate && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void setStatus(article.id, 'published')}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1"
                                                >
                                                    {busy ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    )}
                                                    {copy.publish}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void setStatus(article.id, 'rejected')}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" />
                                                    {copy.reject}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
