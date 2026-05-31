'use client';

import type { RefObject } from 'react';

import { AlertTriangle, BarChart3, CheckCircle2, Columns3, FileSpreadsheet, Lightbulb, Loader2, Rows3, ShieldAlert, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';

import { SaveArticleButton } from '../SaveArticleButton';
import { getWorkspaceCopy } from '../../i18n';
import type { CSVResult, LocaleCode } from '../../types';
import { qualityColor, qualityPercent } from '../../utils';

interface CsvTabProps {
    locale: LocaleCode;
    csvFile: File | null;
    csvLoading: boolean;
    csvResult: CSVResult | null;
    csvError: string | null;
    csvInputRef: RefObject<HTMLInputElement>;
    onFileSelect: (file: File) => void;
    onAnalyze: () => void;
    onReset: () => void;
    onSaveAsArticle?: () => void;
    saveArticleLoading?: boolean;
}

export function CsvTab({
    locale,
    csvFile,
    csvLoading,
    csvResult,
    csvError,
    csvInputRef,
    onFileSelect,
    onAnalyze,
    onReset,
    onSaveAsArticle,
    saveArticleLoading,
}: CsvTabProps) {
    const copy = getWorkspaceCopy(locale).csv;

    return (
        <div className="space-y-6 animate-fade-in">
            {!csvResult ? (
                <div className="card p-8">
                    <input ref={csvInputRef} type="file" accept=".csv" onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} className="hidden" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                            <p className="text-sm text-surface-500">{copy.subtitle}</p>
                        </div>
                    </div>

                    <div
                        onClick={() => csvInputRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            csvFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/20'
                        }`}
                    >
                        {csvFile ? (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                                    <FileSpreadsheet className="w-6 h-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-surface-900">{csvFile.name}</p>
                                    <p className="text-sm text-surface-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Upload className="w-10 h-10 mx-auto text-surface-400 mb-3" />
                                <p className="font-medium text-surface-700">{copy.uploadPrompt}</p>
                                <p className="text-sm text-surface-500 mt-1">{copy.maxSize}</p>
                            </div>
                        )}
                    </div>

                    {csvError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <p className="text-sm text-red-700">{csvError}</p>
                        </div>
                    )}

                    {csvFile && (
                        <div className="flex gap-3">
                            <button onClick={onAnalyze} disabled={csvLoading} className="btn-primary flex-1 !py-3.5 disabled:opacity-50 bg-rose-600 hover:bg-rose-700">
                                {csvLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.analyzing}</> : <><Sparkles className="w-5 h-5 mr-2" />{copy.analyze}</>}
                            </button>
                            <button onClick={onReset} className="btn-secondary !px-4"><X className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="card p-5 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-surface-900">{csvResult.filename}</p>
                                <p className="text-sm text-surface-500">{csvResult.total_rows.toLocaleString()} {copy.rows.toLowerCase()}</p>
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
                        <div className="card p-4 text-center"><Rows3 className="w-5 h-5 mx-auto text-rose-500 mb-1" /><p className="text-xl font-bold">{csvResult.total_rows.toLocaleString()}</p><p className="text-xs text-surface-500">{copy.rows}</p></div>
                        <div className="card p-4 text-center"><Columns3 className="w-5 h-5 mx-auto text-rose-500 mb-1" /><p className="text-xl font-bold">{csvResult.total_columns}</p><p className="text-xs text-surface-500">{copy.columns}</p></div>
                        <div className="card p-4 text-center"><BarChart3 className="w-5 h-5 mx-auto text-rose-500 mb-1" /><p className={`text-xl font-bold ${qualityColor(csvResult.data_quality?.overall)}`}>{qualityPercent(csvResult.data_quality?.overall)}</p><p className="text-xs text-surface-500">{copy.quality}</p></div>
                        <div className="card p-4 text-center"><CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1" /><p className={`text-xl font-bold ${qualityColor(csvResult.data_quality?.completeness)}`}>{qualityPercent(csvResult.data_quality?.completeness)}</p><p className="text-xs text-surface-500">{copy.completeness}</p></div>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-medium text-surface-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-500" /> {copy.summary}</h3>
                        <p className="text-surface-700">{csvResult.summary}</p>
                    </div>

                    {csvResult.security_verdict && (
                        <div className={`card p-6 ${csvResult.security_verdict.is_safe ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'}`}>
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                {csvResult.security_verdict.is_safe ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                                Безопасность
                            </h3>
                            <p className={`font-medium ${csvResult.security_verdict.is_safe ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {csvResult.security_verdict.is_safe ? 'Контент допустим, вирусные признаки не обнаружены' : 'Требуется дополнительная проверка'}
                            </p>
                            <p className="text-sm text-surface-700 mt-2">{csvResult.security_verdict.summary}</p>
                        </div>
                    )}

                    {csvResult.anomalies.length > 0 && (
                        <div className="card p-6 border-amber-200">
                            <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {copy.anomalies} ({csvResult.anomalies.length})</h3>
                            <ul className="space-y-2">
                                {csvResult.anomalies.map((anomaly, index) => (
                                    <li key={index} className="text-sm text-surface-700 flex items-start gap-2">
                                        <span className="text-amber-500">{index + 1}.</span> {anomaly}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {csvResult.recommendations.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary-500" /> {copy.recommendations}</h3>
                            <ul className="space-y-2">
                                {csvResult.recommendations.map((recommendation, index) => (
                                    <li key={index} className="text-sm text-surface-700 flex items-start gap-2">
                                        <span className="text-primary-400">•</span> {recommendation}
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
