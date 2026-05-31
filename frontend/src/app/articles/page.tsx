'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Loader2, Newspaper, Sparkles } from 'lucide-react';

import Navbar from '@/app/components/Navbar';
import { contentApi, type Article } from '@/lib/content';
import { statusLabel } from '@/app/workspace/articles-i18n';
import type { LocaleCode } from '@/app/i18n';
import { LOCALES } from '@/app/i18n';

export default function ArticlesPage() {
    const [locale, setLocale] = useState<LocaleCode>('ru');
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('locale') as LocaleCode | null;
            if (stored && LOCALES.includes(stored)) {
                setLocale(stored);
            }
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        contentApi
            .listPublished({ page })
            .then((res) => {
                setArticles(res.items);
                setPages(res.pages || 1);
            })
            .catch(() => setArticles([]))
            .finally(() => setLoading(false));
    }, [page]);

    const blogTitle =
        locale === 'en' ? 'Blog' : locale === 'kk' ? 'Блог' : 'Блог AI CMS';
    const blogSubtitle =
        locale === 'en'
            ? 'Published articles from the community'
            : locale === 'kk'
              ? 'Қауымдастықтың жарияланған мақалалары'
              : 'Опубликованные материалы платформы';

    return (
        <div className="min-h-screen bg-gradient-to-b from-surface-50 to-white">
            <Navbar />
            <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {locale === 'en' ? 'Home' : locale === 'kk' ? 'Басты бет' : 'На главную'}
                </Link>

                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                            <Newspaper className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-surface-900">{blogTitle}</h1>
                    </div>
                    <p className="text-surface-600">{blogSubtitle}</p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : articles.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Sparkles className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                        <p className="text-surface-500">
                            {locale === 'en'
                                ? 'No published articles yet.'
                                : locale === 'kk'
                                  ? 'Жарияланған мақалалар әлі жоқ.'
                                  : 'Пока нет опубликованных статей.'}
                        </p>
                        <Link href="/workspace" className="btn-primary text-sm mt-6 inline-block">
                            {locale === 'en' ? 'Go to workspace' : 'Открыть workspace'}
                        </Link>
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {articles.map((article) => (
                            <li key={article.id}>
                                <Link
                                    href={`/articles/${article.id}`}
                                    className="card block overflow-hidden hover:border-primary-300 hover:shadow-md transition-all group"
                                >
                                    {article.cover_image_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={article.cover_image_url}
                                            alt=""
                                            className="w-full h-40 object-cover"
                                        />
                                    )}
                                    <div className="p-6">
                                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium mb-2">
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50">
                                            {statusLabel(locale, article.status)}
                                        </span>
                                        {article.category?.name && (
                                            <span className="text-surface-500">{article.category.name}</span>
                                        )}
                                    </div>
                                    <h2 className="text-xl font-semibold text-surface-900 group-hover:text-primary-600 transition-colors">
                                        {article.title}
                                    </h2>
                                    <p className="text-surface-600 mt-2 line-clamp-3">
                                        {article.summary || article.content.slice(0, 280)}
                                    </p>
                                    <p className="text-xs text-surface-400 mt-4 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(article.created_at).toLocaleDateString(
                                            locale === 'en' ? 'en-US' : locale === 'kk' ? 'kk-KZ' : 'ru-RU',
                                        )}
                                    </p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {pages > 1 && !loading && (
                    <div className="flex justify-center gap-4 mt-10">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="btn-secondary text-sm disabled:opacity-40"
                        >
                            ←
                        </button>
                        <span className="text-sm text-surface-500 self-center">
                            {page} / {pages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="btn-secondary text-sm disabled:opacity-40"
                        >
                            →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
