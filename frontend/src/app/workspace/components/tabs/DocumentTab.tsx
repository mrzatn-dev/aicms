'use client';

import type { RefObject } from 'react';

import { AlertTriangle, CheckCircle2, FileText, FileType, Lightbulb, Loader2, ShieldAlert, ShieldCheck, Sparkles, Upload } from 'lucide-react';

import { getWorkspaceCopy } from '../../i18n';
import type { DocumentResult, LocaleCode } from '../../types';

interface DocumentTabProps {
    locale: LocaleCode;
    docFile: File | null;
    docLoading: boolean;
    docResult: DocumentResult | null;
    docError: string | null;
    docInputRef: RefObject<HTMLInputElement>;
    onFileSelect: (file: File) => void;
    onAnalyze: () => void;
    onReset: () => void;
}

export function DocumentTab({
    locale,
    docFile,
    docLoading,
    docResult,
    docError,
    docInputRef,
    onFileSelect,
    onAnalyze,
    onReset,
}: DocumentTabProps) {
    const copy = getWorkspaceCopy(locale).document;

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {!docResult ? (
                <div className="card p-8">
                    <input ref={docInputRef} type="file" accept=".txt,.pdf,.docx" onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} className="hidden" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                            <p className="text-sm text-surface-500">{copy.subtitle}</p>
                        </div>
                    </div>

                    <div
                        onClick={() => docInputRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            docFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/20'
                        }`}
                    >
                        {docFile ? (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <FileType className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-surface-900">{docFile.name}</p>
                                    <p className="text-sm text-surface-500">{(docFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Upload className="w-10 h-10 mx-auto text-surface-400 mb-3" />
                                <p className="font-medium text-surface-700">{copy.uploadPrompt}</p>
                                <p className="text-sm text-surface-500 mt-1">{copy.supported}</p>
                            </div>
                        )}
                    </div>

                    {docError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <p className="text-sm text-red-700">{docError}</p>
                        </div>
                    )}

                    {docFile && (
                        <button onClick={onAnalyze} disabled={docLoading} className="btn-primary w-full !py-3.5 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700">
                            {docLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.analyzing}</> : <><Sparkles className="w-5 h-5 mr-2" />{copy.analyze}</>}
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="card p-5 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-surface-900">{docResult.filename}</p>
                                <p className="text-sm text-surface-500">{docResult.word_count} слов • {docResult.language}</p>
                            </div>
                        </div>
                        <button onClick={onReset} className="btn-secondary text-sm">{copy.new}</button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-surface-900">{Math.round(docResult.quality_score * 100)}%</p>
                            <p className="text-xs text-surface-500">{copy.quality}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-surface-900">{docResult.word_count}</p>
                            <p className="text-xs text-surface-500">{copy.words}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-lg font-bold text-surface-900">{docResult.content_category}</p>
                            <p className="text-xs text-surface-500">{copy.type}</p>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-medium text-surface-900 mb-2">{copy.summary}</h3>
                        <p className="text-surface-700">{docResult.ai_summary}</p>
                    </div>

                    {docResult.security_verdict && (
                        <div className={`card p-6 ${docResult.security_verdict.is_safe ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'}`}>
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                {docResult.security_verdict.is_safe ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                                Безопасность
                            </h3>
                            <p className={`font-medium ${docResult.security_verdict.is_safe ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {docResult.security_verdict.is_safe ? 'Контент допустим, вирусные признаки не обнаружены' : 'Требуется дополнительная проверка'}
                            </p>
                            <p className="text-sm text-surface-700 mt-2">{docResult.security_verdict.summary}</p>
                        </div>
                    )}

                    {docResult.ai_recommendations.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-primary-500" /> {copy.recommendations}
                            </h3>
                            <ul className="space-y-2">
                                {docResult.ai_recommendations.map((recommendation, index) => (
                                    <li key={index} className="text-sm text-surface-700 flex items-start gap-2">
                                        <span className="text-primary-400">•</span> {recommendation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {docResult.warnings.length > 0 && (
                        <div className="card p-6 border-amber-200 bg-amber-50">
                            <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> {copy.warnings}
                            </h3>
                            <ul className="space-y-2">
                                {docResult.warnings.map((warning, index) => (
                                    <li key={index} className="text-sm text-amber-700">{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
