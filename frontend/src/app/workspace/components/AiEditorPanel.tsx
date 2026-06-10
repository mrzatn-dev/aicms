'use client';

import { useState } from 'react';
import {
    CheckCircle2,
    Heading1,
    Loader2,
    Search,
    ShieldCheck,
    Sparkles,
    Wand2,
} from 'lucide-react';

import { api } from '@/lib/api';
import { showToast } from './ToastHost';
import { getArticlesCopy } from '../articles-i18n';
import type { LocaleCode } from '../types';

interface AiEditorPanelProps {
    locale: LocaleCode;
    title: string;
    content: string;
    onApplyContent: (text: string) => void;
    onApplyTitle: (title: string) => void;
    onAddTags: (tags: string[]) => void;
}

type TitleSuggestion = { title: string; meta_description: string };

type SeoResult = { title: string; meta_description: string; keywords: string[] };

type CheckResult = {
    is_valid: boolean;
    reason: string;
    score: number;
    issues: string[];
    suggestions: string[];
};

const IMPROVE_MODES = ['style', 'clarity', 'shorten', 'expand'] as const;

export function AiEditorPanel({
    locale,
    title,
    content,
    onApplyContent,
    onApplyTitle,
    onAddTags,
}: AiEditorPanelProps) {
    const copy = getArticlesCopy(locale).ai;

    const [improveMode, setImproveMode] = useState<string>('style');
    const [improving, setImproving] = useState(false);
    const [improved, setImproved] = useState<{ text: string; changes: string[] } | null>(null);

    const [titlesLoading, setTitlesLoading] = useState(false);
    const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);

    const [seoLoading, setSeoLoading] = useState(false);
    const [seo, setSeo] = useState<SeoResult | null>(null);

    const [checking, setChecking] = useState(false);
    const [check, setCheck] = useState<CheckResult | null>(null);

    const contentReady = content.trim().length >= 30;

    const guardContent = (): boolean => {
        if (!contentReady) {
            showToast(copy.tooShort, 'error');
            return false;
        }
        return true;
    };

    const handleImprove = async () => {
        if (!guardContent()) return;
        setImproving(true);
        try {
            const res = await api.improveText({
                text: content,
                mode: improveMode,
                language: locale,
            });
            setImproved({ text: res.improved_text, changes: res.changes ?? [] });
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.error, 'error');
        } finally {
            setImproving(false);
        }
    };

    const handleTitles = async () => {
        if (!guardContent()) return;
        setTitlesLoading(true);
        try {
            const res = await api.suggestTitles({ content, count: 4, language: locale });
            setTitleSuggestions(res.suggestions ?? []);
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.error, 'error');
        } finally {
            setTitlesLoading(false);
        }
    };

    const handleSeo = async () => {
        if (!guardContent()) return;
        setSeoLoading(true);
        try {
            const res = await api.generateSEO(content);
            setSeo(res);
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.error, 'error');
        } finally {
            setSeoLoading(false);
        }
    };

    const handleCheck = async () => {
        if (!guardContent()) return;
        setChecking(true);
        try {
            const res = await api.validateContent({
                title: title || 'Untitled',
                content,
                language: locale,
            });
            setCheck(res);
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.error, 'error');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="card p-4 space-y-5 border-violet-200 bg-violet-50/40">
            <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-semibold text-surface-900">{copy.panelTitle}</h4>
                    <p className="text-xs text-surface-500">{copy.panelHint}</p>
                </div>
            </div>

            {/* ── Improve text ─────────────────────────────────── */}
            <section className="space-y-2">
                <p className="text-xs font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    {copy.improveSection}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {IMPROVE_MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setImproveMode(mode)}
                            className={`text-xs px-2.5 py-1 rounded-lg border ${
                                improveMode === mode
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'bg-white text-surface-600 border-surface-200 hover:border-violet-300'
                            }`}
                        >
                            {copy.improveModes[mode] ?? mode}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="btn-secondary text-xs w-full inline-flex items-center justify-center gap-2"
                    disabled={improving}
                    onClick={() => void handleImprove()}
                >
                    {improving ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {copy.improving}
                        </>
                    ) : (
                        copy.improveButton
                    )}
                </button>
                {improved && (
                    <div className="rounded-xl border border-violet-200 bg-white p-3 space-y-2">
                        <p className="text-xs font-medium text-surface-700">{copy.improvedPreview}</p>
                        <div className="text-xs text-surface-600 whitespace-pre-wrap max-h-48 overflow-y-auto rounded-lg bg-surface-50 p-2">
                            {improved.text}
                        </div>
                        {improved.changes.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-surface-700 mb-1">{copy.changesTitle}</p>
                                <ul className="text-xs text-surface-500 list-disc pl-4 space-y-0.5">
                                    {improved.changes.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="btn-primary text-xs !py-1.5 flex-1"
                                onClick={() => {
                                    onApplyContent(improved.text);
                                    setImproved(null);
                                }}
                            >
                                {copy.applyImproved}
                            </button>
                            <button
                                type="button"
                                className="btn-secondary text-xs !py-1.5 flex-1"
                                onClick={() => setImproved(null)}
                            >
                                {copy.discardImproved}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ── Titles & meta ────────────────────────────────── */}
            <section className="space-y-2">
                <p className="text-xs font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Heading1 className="w-3.5 h-3.5" />
                    {copy.titlesSection}
                </p>
                <button
                    type="button"
                    className="btn-secondary text-xs w-full inline-flex items-center justify-center gap-2"
                    disabled={titlesLoading}
                    onClick={() => void handleTitles()}
                >
                    {titlesLoading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {copy.titlesLoading}
                        </>
                    ) : (
                        copy.titlesButton
                    )}
                </button>
                {titleSuggestions.length > 0 && (
                    <div className="space-y-2">
                        {titleSuggestions.map((s, i) => (
                            <div key={i} className="rounded-xl border border-surface-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-surface-900">{s.title}</p>
                                    <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 flex-shrink-0"
                                        onClick={() => onApplyTitle(s.title)}
                                    >
                                        {copy.applyTitle}
                                    </button>
                                </div>
                                {s.meta_description && (
                                    <p className="text-xs text-surface-500 mt-1">
                                        <span className="font-medium">{copy.metaLabel}:</span> {s.meta_description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── SEO ──────────────────────────────────────────── */}
            <section className="space-y-2">
                <p className="text-xs font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    {copy.seoSection}
                </p>
                <button
                    type="button"
                    className="btn-secondary text-xs w-full inline-flex items-center justify-center gap-2"
                    disabled={seoLoading}
                    onClick={() => void handleSeo()}
                >
                    {seoLoading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {copy.seoLoading}
                        </>
                    ) : (
                        copy.seoButton
                    )}
                </button>
                {seo && (
                    <div className="rounded-xl border border-surface-200 bg-white p-3 space-y-2">
                        {seo.title && (
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-surface-900">{seo.title}</p>
                                <button
                                    type="button"
                                    className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 flex-shrink-0"
                                    onClick={() => onApplyTitle(seo.title)}
                                >
                                    {copy.applyTitle}
                                </button>
                            </div>
                        )}
                        {seo.meta_description && (
                            <p className="text-xs text-surface-500">
                                <span className="font-medium">{copy.metaLabel}:</span> {seo.meta_description}
                            </p>
                        )}
                        {seo.keywords.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-surface-700 mb-1">{copy.keywordsLabel}</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {seo.keywords.map((k, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => onAddTags(seo.keywords)}
                                >
                                    {copy.addKeywordsToTags}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Content check ────────────────────────────────── */}
            <section className="space-y-2">
                <p className="text-xs font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {copy.checkSection}
                </p>
                <button
                    type="button"
                    className="btn-secondary text-xs w-full inline-flex items-center justify-center gap-2"
                    disabled={checking}
                    onClick={() => void handleCheck()}
                >
                    {checking ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {copy.checking}
                        </>
                    ) : (
                        copy.checkButton
                    )}
                </button>
                {check && (
                    <div
                        className={`rounded-xl border p-3 space-y-2 ${
                            check.is_valid
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-amber-200 bg-amber-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2
                                className={`w-4 h-4 ${check.is_valid ? 'text-emerald-600' : 'text-amber-600'}`}
                            />
                            <p className="text-sm font-medium text-surface-900">
                                {copy.scoreLabel}: {check.score}/100
                            </p>
                        </div>
                        <p className="text-xs text-surface-600">
                            {check.is_valid && check.issues.length === 0 ? copy.validOk : check.reason}
                        </p>
                        {check.issues.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-surface-700 mb-1">{copy.issuesLabel}</p>
                                <ul className="text-xs text-surface-600 list-disc pl-4 space-y-0.5">
                                    {check.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {check.suggestions.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-surface-700 mb-1">{copy.suggestionsLabel}</p>
                                <ul className="text-xs text-surface-600 list-disc pl-4 space-y-0.5">
                                    {check.suggestions.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
