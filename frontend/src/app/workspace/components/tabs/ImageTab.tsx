'use client';

import type { RefObject } from 'react';

import { AlertTriangle, CheckCircle2, HardDrive, Image as ImageIcon, Lightbulb, Loader2, Maximize2, Palette, ShieldAlert, Sparkles, Upload, X } from 'lucide-react';

import { SaveArticleButton } from '../SaveArticleButton';
import { getWorkspaceCopy } from '../../i18n';
import type { ImageResult, LocaleCode } from '../../types';

interface ImageTabProps {
    locale: LocaleCode;
    imgFile: File | null;
    imgPreview: string | null;
    imgLoading: boolean;
    imgResult: ImageResult | null;
    imgError: string | null;
    imgInputRef: RefObject<HTMLInputElement>;
    onFileSelect: (file: File) => void;
    onAnalyze: () => void;
    onReset: () => void;
    onSaveAsArticle?: () => void;
    saveArticleLoading?: boolean;
}

export function ImageTab({
    locale,
    imgFile,
    imgPreview,
    imgLoading,
    imgResult,
    imgError,
    imgInputRef,
    onFileSelect,
    onAnalyze,
    onReset,
    onSaveAsArticle,
    saveArticleLoading,
}: ImageTabProps) {
    const copy = getWorkspaceCopy(locale).image;

    return (
        <div className="space-y-6 animate-fade-in">
            {!imgResult ? (
                <div className="card p-8">
                    <input ref={imgInputRef} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} className="hidden" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                            <p className="text-sm text-surface-500">{copy.subtitle}</p>
                        </div>
                    </div>

                    <div
                        onClick={() => imgInputRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            imgPreview ? 'border-emerald-300 bg-emerald-50/30' : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/20'
                        }`}
                    >
                        {imgPreview ? (
                            <div className="flex flex-col items-center">
                                <img src={imgPreview} alt="Preview" className="w-48 h-48 object-cover rounded-xl mb-4 shadow-lg" />
                                <p className="font-medium text-surface-900">{imgFile?.name}</p>
                                <p className="text-sm text-surface-500">{imgFile ? `${(imgFile.size / 1024).toFixed(1)} KB` : ''}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Upload className="w-10 h-10 mx-auto text-surface-400 mb-3" />
                                <p className="font-medium text-surface-700">{copy.uploadPrompt}</p>
                                <p className="text-sm text-surface-500 mt-1">{copy.supported}</p>
                            </div>
                        )}
                    </div>

                    {imgError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <p className="text-sm text-red-700">{imgError}</p>
                        </div>
                    )}

                    {imgFile && (
                        <div className="flex gap-3">
                            <button onClick={onAnalyze} disabled={imgLoading} className="btn-primary flex-1 !py-3.5 disabled:opacity-50 bg-cyan-600 hover:bg-cyan-700">
                                {imgLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.analyzing}</> : <><Sparkles className="w-5 h-5 mr-2" />{copy.analyze}</>}
                            </button>
                            <button onClick={onReset} className="btn-secondary !px-4"><X className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="card p-5 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50">
                        <div className="flex items-center gap-3">
                            {imgPreview && <img src={imgPreview} alt="" className="w-14 h-14 object-cover rounded-lg" />}
                            <div>
                                <p className="font-medium text-surface-900">{imgResult.filename}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${imgResult.is_suitable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {imgResult.is_suitable ? copy.suitable : copy.notRecommended}
                                </span>
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
                            <button onClick={onReset} className="btn-secondary text-sm">{copy.new}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4 text-center"><Maximize2 className="w-5 h-5 mx-auto text-cyan-500 mb-1" /><p className="text-lg font-bold">{imgResult.width}×{imgResult.height}</p><p className="text-xs text-surface-500">{copy.size}</p></div>
                        <div className="card p-4 text-center"><HardDrive className="w-5 h-5 mx-auto text-cyan-500 mb-1" /><p className="text-lg font-bold">{imgResult.file_size_kb > 1024 ? `${(imgResult.file_size_kb / 1024).toFixed(1)} MB` : `${imgResult.file_size_kb.toFixed(0)} KB`}</p><p className="text-xs text-surface-500">{copy.file}</p></div>
                        <div className="card p-4 text-center"><ImageIcon className="w-5 h-5 mx-auto text-cyan-500 mb-1" /><p className="text-lg font-bold">{imgResult.format}</p><p className="text-xs text-surface-500">{copy.format}</p></div>
                        <div className="card p-4 text-center"><Palette className="w-5 h-5 mx-auto text-cyan-500 mb-1" /><p className="text-lg font-bold">{imgResult.color_mode}</p><p className="text-xs text-surface-500">{copy.color}</p></div>
                    </div>

                    {imgResult.ai_summary && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-500" /> {copy.assessment}</h3>
                            <p className="text-surface-700">{imgResult.ai_summary}</p>
                        </div>
                    )}

                    {imgResult.security_verdict && (
                        <div className={`card p-6 ${imgResult.security_verdict.is_safe ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'}`}>
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                {imgResult.security_verdict.is_safe ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                                Безопасность
                            </h3>
                            <p className={`font-medium ${imgResult.security_verdict.is_safe ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {imgResult.security_verdict.is_safe ? 'Контент допустим, вирусные признаки не обнаружены' : 'Требуется дополнительная проверка'}
                            </p>
                            <p className="text-sm text-surface-700 mt-2">{imgResult.security_verdict.summary}</p>
                        </div>
                    )}

                    {imgResult.ai_recommendations.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary-500" /> {copy.recommendations}</h3>
                            <ul className="space-y-2">
                                {imgResult.ai_recommendations.map((recommendation, index) => (
                                    <li key={index} className="text-sm text-surface-700 flex items-start gap-2">
                                        <span className="text-primary-400">•</span> {recommendation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {imgResult.warnings.length > 0 && (
                        <div className="card p-6 border-amber-200 bg-amber-50">
                            <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {copy.warnings}</h3>
                            <ul className="space-y-2">
                                {imgResult.warnings.map((warning, index) => (
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
