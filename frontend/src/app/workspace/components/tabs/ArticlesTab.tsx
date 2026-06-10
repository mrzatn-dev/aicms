'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Loader2,
    Newspaper,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';

import { ArticleBody } from '@/app/components/ArticleBody';
import {
    contentApi,
    type Article,
    type ArticleCategory,
} from '@/lib/content';
import { AiEditorPanel } from '../AiEditorPanel';
import { showToast } from '../ToastHost';
import { getArticlesCopy, statusLabel } from '../../articles-i18n';
import { getLocaleTag } from '../../i18n';
import type { LocaleCode, UserInfo } from '../../types';

interface ArticlesTabProps {
    locale: LocaleCode;
    user: UserInfo;
    refreshToken?: number;
}

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    pending: 'bg-amber-100 text-amber-800',
    validating: 'bg-sky-100 text-sky-800',
    analyzing: 'bg-indigo-100 text-indigo-800',
    published: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
};

export function ArticlesTab({ locale, user, refreshToken = 0 }: ArticlesTabProps) {
    const copy = getArticlesCopy(locale);
    const localeTag = getLocaleTag(locale);
    const isAdmin = user.role === 'admin';

    const [articles, setArticles] = useState<Article[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<ArticleCategory[]>([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formTags, setFormTags] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);

    const handleAddTagsFromAi = (newTags: string[]) => {
        setFormTags((prev) => {
            const existing = prev
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const lower = new Set(existing.map((t) => t.toLowerCase()));
            const merged = [...existing];
            for (const tag of newTags) {
                const clean = tag.trim();
                if (clean && !lower.has(clean.toLowerCase())) {
                    merged.push(clean);
                    lower.add(clean.toLowerCase());
                }
            }
            return merged.join(', ');
        });
    };

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search]);

    const loadArticles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await contentApi.listMine({
                page,
                search: searchDebounced || undefined,
            });
            setArticles(res.items);
            setPages(res.pages || 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : copy.saveError);
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [page, searchDebounced, copy.saveError]);

    useEffect(() => {
        void loadArticles();
    }, [loadArticles, refreshToken]);

    const hasProcessing = articles.some((a) =>
        ['validating', 'analyzing', 'pending'].includes(a.status),
    );

    useEffect(() => {
        if (!hasProcessing) return;
        const timer = window.setInterval(() => {
            void loadArticles();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [hasProcessing, loadArticles]);

    useEffect(() => {
        contentApi.listCategories().then(setCategories).catch(() => setCategories([]));
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setFormTitle('');
        setFormContent('');
        setFormCategoryId('');
        setFormTags('');
        setCoverUrl(null);
        setEditorMode('edit');
        setEditorOpen(true);
    };

    const openEdit = (article: Article) => {
        setEditingId(article.id);
        setFormTitle(article.title);
        setFormContent(article.content);
        setFormCategoryId(article.category?.id ?? '');
        setFormTags(article.tags.map((t) => t.name).join(', '));
        setCoverUrl(article.cover_image_url ?? null);
        setEditorMode('edit');
        setEditorOpen(true);
    };

    const handleSave = async () => {
        if (formTitle.trim().length < 5 || formContent.trim().length < 10) {
            return;
        }
        setSaving(true);
        try {
            const tags = formTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const payload = {
                title: formTitle.trim(),
                content: formContent.trim(),
                category_id: formCategoryId || null,
                tags,
            };
            if (editingId) {
                await contentApi.update(editingId, payload);
            } else {
                const created = await contentApi.create(payload);
                setEditingId(created.id);
                setCoverUrl(created.cover_image_url ?? null);
            }
            showToast(copy.saveSuccess, 'success');
            await loadArticles();
        } catch (e) {
            const msg = e instanceof Error ? e.message : copy.saveError;
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(copy.deleteConfirm)) return;
        setActionId(id);
        try {
            await contentApi.delete(id);
            await loadArticles();
        } catch (e) {
            setError(e instanceof Error ? e.message : copy.saveError);
        } finally {
            setActionId(null);
        }
    };

    const handleCoverUpload = async (file: File) => {
        if (!editingId) return;
        setCoverUploading(true);
        try {
            const updated = await contentApi.uploadCover(editingId, file);
            setCoverUrl(updated.cover_image_url ?? null);
            showToast(copy.saveSuccess, 'success');
            await loadArticles();
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.saveError, 'error');
        } finally {
            setCoverUploading(false);
        }
    };

    const setStatus = async (id: string, newStatus: string) => {
        setActionId(id);
        try {
            if (isAdmin) {
                await contentApi.updateStatus(id, newStatus);
            } else {
                await contentApi.update(id, { status: newStatus });
            }
            await loadArticles();
        } catch (e) {
            setError(e instanceof Error ? e.message : copy.saveError);
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
                        <Newspaper className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                        <p className="text-sm text-surface-500">{copy.subtitle}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/articles"
                        target="_blank"
                        className="btn-secondary text-sm inline-flex items-center gap-2"
                    >
                        <ExternalLink className="w-4 h-4" />
                        {copy.publicBlog}
                    </Link>
                    <button type="button" onClick={openCreate} className="btn-primary text-sm inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {copy.newArticle}
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder={copy.searchPlaceholder}
                    className="input-field w-full !pl-10"
                />
            </div>

            {hasProcessing && (
                <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    {locale === 'en'
                        ? 'Pipeline in progress — list refreshes automatically.'
                        : locale === 'kk'
                          ? 'Процесс жүріп жатыр — тізім автоматты жаңартылады.'
                          : 'Идёт проверка — список обновляется автоматически.'}
                </p>
            )}

            {error && (
                <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
            )}

            {editorOpen && (
                <div className="card p-6 space-y-4 border-primary-200">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium text-surface-900">
                            {editingId ? copy.edit : copy.newArticle}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setAiPanelOpen((v) => !v)}
                            className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border transition-colors ${
                                aiPanelOpen
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {copy.ai.panelToggle}
                        </button>
                    </div>
                    <div className={aiPanelOpen ? 'grid lg:grid-cols-[minmax(0,1fr),340px] gap-6 items-start' : ''}>
                    <div className="space-y-4 min-w-0">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">{copy.titleLabel}</label>
                        <input
                            className="input-field w-full"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            minLength={5}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-surface-700">{copy.contentLabel}</label>
                            <div className="flex rounded-lg border border-surface-200 overflow-hidden text-xs">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('edit')}
                                    className={`px-3 py-1.5 ${editorMode === 'edit' ? 'bg-primary-600 text-white' : 'bg-white text-surface-600'}`}
                                >
                                    {copy.editMode}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('preview')}
                                    className={`px-3 py-1.5 ${editorMode === 'preview' ? 'bg-primary-600 text-white' : 'bg-white text-surface-600'}`}
                                >
                                    {copy.preview}
                                </button>
                            </div>
                        </div>
                        {editorMode === 'preview' ? (
                            <div className="card p-4 min-h-[160px] max-h-[320px] overflow-y-auto">
                                <ArticleBody content={formContent || ' '} />
                            </div>
                        ) : (
                            <textarea
                                className="input-field w-full resize-y min-h-[160px]"
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                rows={8}
                            />
                        )}
                    </div>
                    {editingId && (
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">{copy.coverImage}</label>
                            {coverUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={coverUrl}
                                    alt=""
                                    className="w-full max-h-40 object-cover rounded-xl mb-3 border border-surface-200"
                                />
                            )}
                            <label className="btn-secondary text-sm inline-flex items-center gap-2 cursor-pointer">
                                {coverUploading ? copy.uploadingCover : copy.uploadCover}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={coverUploading}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void handleCoverUpload(file);
                                    }}
                                />
                            </label>
                        </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">{copy.categoryLabel}</label>
                            <select
                                className="input-field w-full"
                                value={formCategoryId}
                                onChange={(e) => setFormCategoryId(e.target.value)}
                            >
                                <option value="">{copy.noCategory}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">
                                {copy.tagsLabel} <span className="text-surface-400 font-normal">({copy.tagsHint})</span>
                            </label>
                            <input
                                className="input-field w-full"
                                value={formTags}
                                onChange={(e) => setFormTags(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button type="button" className="btn-secondary" onClick={() => setEditorOpen(false)}>
                            {copy.cancel}
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={saving || formTitle.trim().length < 5}
                            onClick={() => void handleSave()}
                        >
                            {saving ? copy.saving : copy.save}
                        </button>
                    </div>
                    </div>
                    {aiPanelOpen && (
                        <AiEditorPanel
                            locale={locale}
                            title={formTitle}
                            content={formContent}
                            onApplyContent={(text) => {
                                setFormContent(text);
                                setEditorMode('edit');
                            }}
                            onApplyTitle={(title) => setFormTitle(title)}
                            onAddTags={handleAddTagsFromAi}
                        />
                    )}
                    </div>
                </div>
            )}

            <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wide">{copy.myArticles}</h3>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : articles.length === 0 ? (
                <div className="card p-12 text-center">
                    <Newspaper className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-surface-600">{copy.empty}</p>
                    <p className="text-sm text-surface-400 mt-1">{copy.emptyHint}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {articles.map((article) => {
                        const busy = actionId === article.id;
                        const badge = STATUS_STYLES[article.status] ?? STATUS_STYLES.draft;
                        return (
                            <article key={article.id} className="card p-5 hover:border-primary-200 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-surface-900 truncate">{article.title}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
                                                {statusLabel(locale, article.status)}
                                            </span>
                                        </div>
                                        {article.summary && (
                                            <p className="text-sm text-surface-600 line-clamp-2">{article.summary}</p>
                                        )}
                                        <p className="text-xs text-surface-400 mt-2">
                                            {copy.updated}: {new Date(article.updated_at).toLocaleString(localeTag)}
                                        </p>
                                        {article.ai_analysis?.quality_score != null && (
                                            <p className="text-xs text-emerald-600 mt-1">
                                                AI quality: {Math.round(article.ai_analysis.quality_score * 100)}%
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {article.status === 'published' && (
                                            <Link
                                                href={`/articles/${article.id}`}
                                                target="_blank"
                                                className="btn-secondary text-xs !py-2"
                                            >
                                                {copy.viewPublic}
                                            </Link>
                                        )}
                                        <button
                                            type="button"
                                            className="p-2 rounded-lg hover:bg-surface-100 text-surface-500"
                                            onClick={() => openEdit(article)}
                                            title={copy.edit}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="p-2 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600"
                                            disabled={busy}
                                            onClick={() => void handleDelete(article.id)}
                                            title={copy.delete}
                                        >
                                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-100">
                                    {['draft', 'rejected'].includes(article.status) && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100"
                                            onClick={() => void setStatus(article.id, 'pending')}
                                        >
                                            {copy.submitReview}
                                        </button>
                                    )}
                                    {isAdmin && ['pending', 'validating', 'analyzing'].includes(article.status) && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                                onClick={() => void setStatus(article.id, 'published')}
                                            >
                                                {copy.publish}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                                                onClick={() => void setStatus(article.id, 'rejected')}
                                            >
                                                {copy.reject}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {pages > 1 && !loading && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-40"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-surface-500">
                        {page} / {pages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= pages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-40"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
