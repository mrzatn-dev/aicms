'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Loader2, Tag } from 'lucide-react';

import { ArticleBody } from '@/app/components/ArticleBody';
import Navbar from '@/app/components/Navbar';
import { contentApi, type Article } from '@/lib/content';
import type { LocaleCode } from '@/app/i18n';
import { LOCALES } from '@/app/i18n';

export default function ArticleDetailPage() {
    const params = useParams();
    const id = typeof params.id === 'string' ? params.id : '';
    const [locale, setLocale] = useState<LocaleCode>('ru');
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('locale') as LocaleCode | null;
            if (stored && LOCALES.includes(stored)) {
                setLocale(stored);
            }
        }
    }, []);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        contentApi
            .getById(id)
            .then((a) => {
                if (a.status !== 'published') {
                    setError(
                        locale === 'en'
                            ? 'This article is not published.'
                            : 'Статья ещё не опубликована.',
                    );
                    setArticle(null);
                } else {
                    setArticle(a);
                    setError(null);
                }
            })
            .catch(() => {
                setError(locale === 'en' ? 'Article not found.' : 'Статья не найдена.');
                setArticle(null);
            })
            .finally(() => setLoading(false));
    }, [id, locale]);

    const dateLocale = locale === 'en' ? 'en-US' : locale === 'kk' ? 'kk-KZ' : 'ru-RU';

    return (
        <div className="min-h-screen bg-gradient-to-b from-surface-50 to-white">
            <Navbar />
            <article className="max-w-3xl mx-auto px-6 pt-28 pb-16">
                <Link
                    href="/articles"
                    className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {locale === 'en' ? 'All articles' : locale === 'kk' ? 'Барлық мақалалар' : 'Все статьи'}
                </Link>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : error || !article ? (
                    <div className="card p-10 text-center text-surface-600">{error}</div>
                ) : (
                    <>
                        {article.cover_image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={article.cover_image_url}
                                alt=""
                                className="w-full rounded-2xl object-cover max-h-80 mb-8 shadow-lg"
                            />
                        )}
                        <header className="mb-8">
                            {article.category?.name && (
                                <p className="text-sm font-medium text-primary-600 mb-2">{article.category.name}</p>
                            )}
                            <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 leading-tight">
                                {article.title}
                            </h1>
                            <p className="text-sm text-surface-400 mt-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(article.created_at).toLocaleDateString(dateLocale, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                            {article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {article.tags.map((t) => (
                                        <span
                                            key={t.id}
                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-surface-100 text-surface-600"
                                        >
                                            <Tag className="w-3 h-3" />
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </header>
                        {article.summary && (
                            <p className="text-lg text-surface-600 mb-8 border-l-4 border-primary-300 pl-4">
                                {article.summary}
                            </p>
                        )}
                        <ArticleBody content={article.content} />
                    </>
                )}
            </article>
        </div>
    );
}
