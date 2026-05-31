'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, FileCheck, Lightbulb, Loader2 } from 'lucide-react';

import { SaveArticleButton } from '../SaveArticleButton';
import { getWorkspaceCopy } from '../../i18n';
import type { LocaleCode, ValidationResult } from '../../types';

interface ValidateTabProps {
    locale: LocaleCode;
    validateTitle: string;
    validateContent: string;
    validateLoading: boolean;
    validateResult: ValidationResult | null;
    onTitleChange: (value: string) => void;
    onContentChange: (value: string) => void;
    onValidate: () => void;
    onReset: () => void;
    onSaveAsArticle?: () => void;
    saveArticleLoading?: boolean;
}

export function ValidateTab({
    locale,
    validateTitle,
    validateContent,
    validateLoading,
    validateResult,
    onTitleChange,
    onContentChange,
    onValidate,
    onReset,
    onSaveAsArticle,
    saveArticleLoading,
}: ValidateTabProps) {
    const copy = getWorkspaceCopy(locale).validate;

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {!validateResult ? (
                <div className="card p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <FileCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                            <p className="text-sm text-surface-500">{copy.subtitle}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">{copy.heading}</label>
                            <input type="text" value={validateTitle} onChange={(e) => onTitleChange(e.target.value)} placeholder={copy.headingPlaceholder} className="input-field w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">{copy.content}</label>
                            <textarea value={validateContent} onChange={(e) => onContentChange(e.target.value)} placeholder={copy.contentPlaceholder} rows={6} className="input-field w-full resize-none" />
                        </div>
                        <button onClick={onValidate} disabled={validateLoading || !validateTitle.trim() || !validateContent.trim()} className="btn-primary w-full !py-3.5 disabled:opacity-50 bg-amber-600 hover:bg-amber-700">
                            {validateLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.submitting}</> : <><FileCheck className="w-5 h-5 mr-2" />{copy.submit}</>}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className={`card p-5 flex items-center justify-between ${validateResult.is_valid ? 'bg-gradient-to-r from-emerald-50 to-green-50' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${validateResult.is_valid ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                {validateResult.is_valid ? <CheckCircle2 className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                                <p className="font-medium text-surface-900">{copy.score}: {validateResult.score}/100</p>
                                <p className="text-sm text-surface-500">{validateResult.is_valid ? copy.passed : copy.hasIssues}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {onSaveAsArticle && (
                                <SaveArticleButton
                                    locale={locale}
                                    loading={saveArticleLoading}
                                    onClick={onSaveAsArticle}
                                />
                            )}
                            <button onClick={onReset} className="btn-secondary text-sm">{copy.reset}</button>
                        </div>
                    </div>

                    {validateResult.issues.length > 0 && (
                        <div className="card p-6 border-red-200">
                            <h3 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {copy.issues}
                            </h3>
                            <ul className="space-y-2">
                                {validateResult.issues.map((issue, index) => (
                                    <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                                        <span className="text-red-400">•</span> {issue}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {validateResult.suggestions.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-amber-500" /> {copy.suggestions}
                            </h3>
                            <ul className="space-y-2">
                                {validateResult.suggestions.map((suggestion, index) => (
                                    <li key={index} className="text-sm text-surface-700 flex items-start gap-2">
                                        <span className="text-primary-400">•</span> {suggestion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
