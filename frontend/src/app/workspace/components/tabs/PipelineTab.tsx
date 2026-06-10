'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    Check,
    Circle,
    ExternalLink,
    FileUp,
    Loader2,
    Newspaper,
    Upload,
    Workflow,
    X,
} from 'lucide-react';

import { api } from '@/lib/api';
import { showToast } from '../ToastHost';
import { getPipelineCopy } from '../../pipeline-i18n';
import { getLocaleTag } from '../../i18n';
import type { LocaleCode, PipelineRunItem, PipelineStage } from '../../types';

interface PipelineTabProps {
    locale: LocaleCode;
    onOpenArticles?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
    processing: 'bg-sky-100 text-sky-800',
    completed: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-700',
};

const SOURCE_STYLES: Record<string, string> = {
    video: 'bg-violet-100 text-violet-700',
    audio: 'bg-teal-100 text-teal-700',
    image: 'bg-cyan-100 text-cyan-700',
    document: 'bg-indigo-100 text-indigo-700',
    text: 'bg-slate-100 text-slate-700',
};

function StageIcon({ status }: { status: PipelineStage['status'] }) {
    if (status === 'done') {
        return (
            <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
            </span>
        );
    }
    if (status === 'running') {
        return (
            <span className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <X className="w-3.5 h-3.5 text-white" />
            </span>
        );
    }
    return (
        <span className="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center flex-shrink-0">
            <Circle className="w-2.5 h-2.5 text-surface-400" />
        </span>
    );
}

export function PipelineTab({ locale, onOpenArticles }: PipelineTabProps) {
    const copy = getPipelineCopy(locale);
    const localeTag = getLocaleTag(locale);

    const [runs, setRuns] = useState<PipelineRunItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [starting, setStarting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadRuns = useCallback(async () => {
        try {
            const res = await api.getPipelines(1, 20);
            setRuns(res.items ?? []);
        } catch {
            setRuns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRuns();
    }, [loadRuns]);

    const hasProcessing = runs.some((r) => r.status === 'processing');

    useEffect(() => {
        if (!hasProcessing) return;
        const timer = window.setInterval(() => {
            void loadRuns();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [hasProcessing, loadRuns]);

    const handleStart = async () => {
        if (!file) return;
        setStarting(true);
        try {
            await api.startPipeline(file);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            await loadRuns();
        } catch (e) {
            showToast(e instanceof Error ? e.message : copy.uploadError, 'error');
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center shadow-md">
                    <Workflow className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                    <p className="text-sm text-surface-500">{copy.subtitle}</p>
                </div>
            </div>

            {/* ── Upload card ─────────────────────────────────── */}
            <div
                className={`card p-6 border-2 border-dashed transition-colors ${
                    dragOver ? 'border-sky-400 bg-sky-50/50' : 'border-surface-200'
                }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                }}
            >
                <div className="flex flex-col items-center text-center gap-3">
                    <Upload className="w-8 h-8 text-surface-400" />
                    <div>
                        <p className="font-medium text-surface-900">{copy.dropTitle}</p>
                        <p className="text-xs text-surface-500 mt-1">{copy.dropHint}</p>
                    </div>
                    {file && (
                        <p className="text-sm text-surface-700 bg-surface-100 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                            <FileUp className="w-4 h-4 text-surface-500" />
                            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            <button
                                type="button"
                                className="text-surface-400 hover:text-red-500"
                                onClick={() => {
                                    setFile(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                }}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </p>
                    )}
                    <div className="flex gap-2">
                        <label className="btn-secondary text-sm cursor-pointer">
                            {copy.selectFile}
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                accept="video/*,audio/*,image/*,.pdf,.docx,.txt,.md"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0];
                                    if (selected) setFile(selected);
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            className="btn-primary text-sm inline-flex items-center gap-2"
                            disabled={!file || starting}
                            onClick={() => void handleStart()}
                        >
                            {starting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {copy.starting}
                                </>
                            ) : (
                                copy.start
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {hasProcessing && (
                <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    {copy.processingBanner}
                </p>
            )}

            <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wide">{copy.myRuns}</h3>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : runs.length === 0 ? (
                <div className="card p-12 text-center">
                    <Workflow className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-surface-600">{copy.empty}</p>
                    <p className="text-sm text-surface-400 mt-1">{copy.emptyHint}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {runs.map((run) => {
                        const statusBadge = STATUS_STYLES[run.status] ?? STATUS_STYLES.processing;
                        const sourceBadge = SOURCE_STYLES[run.source_type] ?? SOURCE_STYLES.text;
                        const summary =
                            (run.result_meta?.summary as string | undefined) ||
                            (run.result_meta?.media_summary as string | undefined);
                        return (
                            <article key={run.id} className="card p-5">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-surface-900 truncate">
                                                {run.original_filename || run.id}
                                            </h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceBadge}`}>
                                                {copy.sourceTypes[run.source_type] ?? run.source_type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>
                                                {copy.statuses[run.status] ?? run.status}
                                            </span>
                                        </div>
                                        {run.created_at && (
                                            <p className="text-xs text-surface-400">
                                                {copy.started}: {new Date(run.created_at).toLocaleString(localeTag)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        {run.article_id && run.status === 'completed' && (
                                            <Link
                                                href={`/articles/${run.article_id}`}
                                                target="_blank"
                                                className="btn-secondary text-xs !py-2 inline-flex items-center gap-1.5"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                {copy.openArticle}
                                            </Link>
                                        )}
                                        {run.article_id && onOpenArticles && (
                                            <button
                                                type="button"
                                                className="btn-secondary text-xs !py-2 inline-flex items-center gap-1.5"
                                                onClick={onOpenArticles}
                                            >
                                                <Newspaper className="w-3.5 h-3.5" />
                                                {copy.goToArticles}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── Stage stepper ───────────────────── */}
                                <div className="mt-4 overflow-x-auto">
                                    <div className="flex items-center gap-0 min-w-max">
                                        {(run.stages ?? []).map((stage, idx) => (
                                            <div key={stage.name} className="flex items-center">
                                                {idx > 0 && (
                                                    <span
                                                        className={`h-0.5 w-6 sm:w-10 ${
                                                            stage.status === 'pending' ? 'bg-surface-200' : 'bg-emerald-300'
                                                        }`}
                                                    />
                                                )}
                                                <div className="flex flex-col items-center gap-1 px-1">
                                                    <StageIcon status={stage.status} />
                                                    <span
                                                        className={`text-[10px] leading-tight text-center max-w-[72px] ${
                                                            stage.status === 'failed'
                                                                ? 'text-red-600 font-medium'
                                                                : stage.status === 'running'
                                                                  ? 'text-sky-700 font-medium'
                                                                  : 'text-surface-500'
                                                        }`}
                                                    >
                                                        {copy.stages[stage.name] ?? stage.name}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {summary && (
                                    <p className="mt-3 text-sm text-surface-600 bg-surface-50 rounded-lg px-3 py-2">
                                        <span className="font-medium text-surface-700">{copy.summaryLabel}:</span> {summary}
                                    </p>
                                )}

                                {run.status === 'failed' && run.error && (
                                    <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>
                                            <span className="font-medium">{copy.errorLabel}:</span> {run.error}
                                        </span>
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
