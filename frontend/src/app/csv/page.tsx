'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    Sparkles,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Lightbulb,
    BarChart3,
    Columns3,
    Rows3,
    X,
    Loader2,
    ShieldAlert,
    TableProperties,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CSVResult {
    filename: string;
    total_rows: number;
    total_columns: number;
    columns: string[];
    summary: string;
    data_quality: {
        completeness?: number;
        consistency?: number;
        overall?: number;
        details?: string;
    };
    anomalies: string[];
    recommendations: string[];
    warnings: string[];
    missing_values: Record<string, number>;
}

export default function CSVPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CSVResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((f: File) => {
        if (!f.name.toLowerCase().endsWith('.csv')) {
            setError('Пожалуйста, выберите файл формата CSV');
            return;
        }
        setFile(f);
        setError(null);
        setResult(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.uploadCSV(file);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Ошибка при анализе файла');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const qualityColor = (score?: number) => {
        if (!score) return 'text-surface-700/50';
        if (score >= 0.8) return 'text-emerald-600';
        if (score >= 0.5) return 'text-amber-600';
        return 'text-red-600';
    };

    const qualityBg = (score?: number) => {
        if (!score) return 'bg-surface-100';
        if (score >= 0.8) return 'bg-emerald-50 border-emerald-200';
        if (score >= 0.5) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
    };

    const qualityPercent = (score?: number) => {
        if (!score) return '—';
        return `${(score * 100).toFixed(0)}%`;
    };

    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-200/60">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">
                            AI<span className="text-primary-600">CMS</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/content"
                            className="text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors"
                        >
                            Content
                        </Link>
                        <Link href="/admin" className="btn-secondary text-sm !px-4 !py-2">
                            Admin
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-28 pb-16 px-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10 animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-surface-900">CSV Анализ</h1>
                            <p className="text-surface-700/60 text-sm">
                                Загрузите CSV-файл для AI-анализа данных
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upload Zone */}
                {!result && (
                    <div className="animate-slide-up">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative card p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                                isDragOver
                                    ? 'border-primary-400 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                                    : file
                                    ? 'border-emerald-300 bg-emerald-50/30'
                                    : 'border-surface-200 hover:border-primary-300 hover:bg-primary-50/20'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            {file ? (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <p className="text-lg font-semibold text-surface-900 mb-1">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-surface-700/60">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                                        <Upload className="w-8 h-8 text-primary-500" />
                                    </div>
                                    <p className="text-lg font-semibold text-surface-900 mb-1">
                                        Перетащите CSV-файл сюда
                                    </p>
                                    <p className="text-sm text-surface-700/60">
                                        или нажмите для выбора файла
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Analyze Button */}
                        {file && (
                            <div className="mt-6 flex items-center gap-3 animate-fade-in">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="btn-primary !px-8 !py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Анализируем...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            Анализировать с AI
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="btn-secondary !px-4 !py-3.5"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-slide-up">
                        {/* File Info Bar */}
                        <div className="card p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-primary-500 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-surface-900">{result.filename}</p>
                                    <p className="text-xs text-surface-700/60">Анализ завершён</p>
                                </div>
                            </div>
                            <button onClick={handleReset} className="btn-secondary !px-4 !py-2 text-sm">
                                Новый файл
                            </button>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="stat-card items-center text-center">
                                <Rows3 className="w-6 h-6 text-primary-500 mb-1" />
                                <p className="text-2xl font-bold text-surface-900">{result.total_rows.toLocaleString()}</p>
                                <p className="text-xs text-surface-700/60">Строк</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <Columns3 className="w-6 h-6 text-primary-500 mb-1" />
                                <p className="text-2xl font-bold text-surface-900">{result.total_columns}</p>
                                <p className="text-xs text-surface-700/60">Колонок</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <BarChart3 className="w-6 h-6 text-primary-500 mb-1" />
                                <p className={`text-2xl font-bold ${qualityColor(result.data_quality?.overall)}`}>
                                    {qualityPercent(result.data_quality?.overall)}
                                </p>
                                <p className="text-xs text-surface-700/60">Качество данных</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                                <p className={`text-2xl font-bold ${qualityColor(result.data_quality?.completeness)}`}>
                                    {qualityPercent(result.data_quality?.completeness)}
                                </p>
                                <p className="text-xs text-surface-700/60">Полнота</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary-500" />
                                AI Резюме
                            </h2>
                            <p className="text-surface-700 leading-relaxed">{result.summary}</p>
                        </div>

                        {/* Columns */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-surface-900 mb-3">Колонки</h2>
                            <div className="flex flex-wrap gap-2">
                                {result.columns.map((col, i) => (
                                    <span
                                        key={i}
                                        className="badge-primary"
                                    >
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Data Quality Details */}
                        {result.data_quality?.details && (
                            <div className={`card p-6 border ${qualityBg(result.data_quality?.overall)}`}>
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary-500" />
                                    Оценка качества
                                </h2>
                                <p className="text-surface-700 leading-relaxed">
                                    {result.data_quality.details}
                                </p>
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-white/60 rounded-xl">
                                        <p className="text-xs text-surface-700/60 mb-1">Полнота</p>
                                        <p className={`text-xl font-bold ${qualityColor(result.data_quality.completeness)}`}>
                                            {qualityPercent(result.data_quality.completeness)}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 bg-white/60 rounded-xl">
                                        <p className="text-xs text-surface-700/60 mb-1">Консистентность</p>
                                        <p className={`text-xl font-bold ${qualityColor(result.data_quality.consistency)}`}>
                                            {qualityPercent(result.data_quality.consistency)}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 bg-white/60 rounded-xl">
                                        <p className="text-xs text-surface-700/60 mb-1">Общее</p>
                                        <p className={`text-xl font-bold ${qualityColor(result.data_quality.overall)}`}>
                                            {qualityPercent(result.data_quality.overall)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Anomalies */}
                        {result.anomalies.length > 0 && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Обнаруженные аномалии
                                    <span className="badge-warning text-xs ml-1">{result.anomalies.length}</span>
                                </h2>
                                <ul className="space-y-2">
                                    {result.anomalies.map((a, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-xl">
                                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-amber-700">{i + 1}</span>
                                            </div>
                                            <p className="text-sm text-surface-700">{a}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings */}
                        {result.warnings && result.warnings.length > 0 && (
                            <div className="card p-6 border border-orange-200 bg-orange-50/30">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                                    Предупреждения валидации
                                    <span className="badge-warning text-xs ml-1">{result.warnings.length}</span>
                                </h2>
                                <ul className="space-y-2">
                                    {result.warnings.map((w, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                                            <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-surface-700">{w}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Missing Values */}
                        {result.missing_values && Object.keys(result.missing_values).length > 0 && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <TableProperties className="w-5 h-5 text-red-500" />
                                    Пропущенные значения по колонкам
                                </h2>
                                <div className="space-y-3">
                                    {Object.entries(result.missing_values)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([col, count]) => {
                                            const pct = result.total_rows > 0 ? (count / result.total_rows) * 100 : 0;
                                            return (
                                                <div key={col} className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-surface-900 w-40 truncate" title={col}>
                                                        {col}
                                                    </span>
                                                    <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                pct > 50 ? 'bg-red-400' : pct > 20 ? 'bg-amber-400' : 'bg-primary-400'
                                                            }`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-surface-700/60 w-24 text-right">
                                                        {count.toLocaleString()} ({pct.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-primary-500" />
                                    Рекомендации
                                </h2>
                                <ul className="space-y-2">
                                    {result.recommendations.map((r, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 bg-primary-50/30 rounded-xl">
                                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Lightbulb className="w-3.5 h-3.5 text-primary-600" />
                                            </div>
                                            <p className="text-sm text-surface-700">{r}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
