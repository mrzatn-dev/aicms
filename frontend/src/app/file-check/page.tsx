'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    Upload,
    FileText,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    File,
    FileType,
    AlertTriangle,
    Sparkles,
    Download,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DocumentResult {
    filename: string;
    file_type: string;
    file_size_kb: number;
    text_length: number;
    word_count: number;
    line_count: number;
    warnings: string[];
    ai_summary: string;
    ai_recommendations: string[];
    content_category: string;
    quality_score: number;
    language: string;
}

const allowedTypes = {
    '.txt': 'Text Document',
    '.pdf': 'PDF Document',
    '.docx': 'Word Document',
};

export default function FileUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DocumentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((f: File) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!allowedTypes[ext as keyof typeof allowedTypes]) {
            setError('Неподдерживаемый формат. Разрешены: TXT, PDF, DOCX');
            return;
        }
        if (f.size > 20 * 1024 * 1024) {
            setError('Файл слишком большой. Максимум 20 MB');
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
            const data = await api.uploadDocument(file);
            setResult(data);
        } catch (e: any) {
            setError(e.message || 'Ошибка при анализе файла');
        }
        setLoading(false);
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getQualityColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 bg-green-50';
        if (score >= 0.6) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-surface-50 to-surface-100">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/ai"
                        className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Назад к AI центру
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-surface-900">Проверка документов</h1>
                            <p className="text-surface-500">Загрузите документ для AI-анализа</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Upload Area */}
                    {!result && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`bg-white rounded-2xl border-2 border-dashed p-8 transition-all ${
                                isDragOver
                                    ? 'border-primary-400 bg-primary-50'
                                    : 'border-surface-300 hover:border-primary-300'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.pdf,.docx"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            {!file ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                        <Upload className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-surface-900 mb-2">
                                        Перетащите файл или нажмите для выбора
                                    </h3>
                                    <p className="text-surface-500 mb-4">Поддерживаются форматы: TXT, PDF, DOCX (до 20 MB)</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                                    >
                                        Выбрать файл
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <FileType className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-surface-900 truncate">{file.name}</p>
                                        <p className="text-sm text-surface-500">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="p-2 text-surface-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                    <p className="text-red-700">{error}</p>
                                </div>
                            )}

                            {file && !error && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Анализирую...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Проанализировать документ
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                            {/* Result Header */}
                            <div className="p-6 border-b border-surface-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-900">Анализ завершён</h3>
                                            <p className="text-sm text-surface-500">{result.filename}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 text-sm text-surface-600 hover:text-primary-600 border border-surface-200 rounded-lg hover:border-primary-300 transition-colors"
                                    >
                                        Новый файл
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-surface-50 rounded-xl">
                                        <p className="text-xs text-surface-500 uppercase">Тип</p>
                                        <p className="font-medium text-surface-900">{result.file_type.toUpperCase()}</p>
                                    </div>
                                    <div className="p-4 bg-surface-50 rounded-xl">
                                        <p className="text-xs text-surface-500 uppercase">Размер</p>
                                        <p className="font-medium text-surface-900">{result.file_size_kb.toFixed(1)} KB</p>
                                    </div>
                                    <div className="p-4 bg-surface-50 rounded-xl">
                                        <p className="text-xs text-surface-500 uppercase">Слов</p>
                                        <p className="font-medium text-surface-900">{result.word_count.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-surface-50 rounded-xl">
                                        <p className="text-xs text-surface-500 uppercase">Язык</p>
                                        <p className="font-medium text-surface-900 capitalize">{result.language}</p>
                                    </div>
                                </div>

                                {/* Quality Score */}
                                <div className={`p-4 rounded-xl ${getQualityColor(result.quality_score)}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl font-bold">
                                            {Math.round(result.quality_score * 100)}%
                                        </div>
                                        <div>
                                            <p className="font-medium">Оценка качества</p>
                                            <p className="text-sm opacity-75">Категория: {result.content_category}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Summary */}
                                <div>
                                    <h4 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
                                        AI Резюме
                                    </h4>
                                    <p className="text-surface-700 leading-relaxed">{result.ai_summary}</p>
                                </div>

                                {/* Recommendations */}
                                {result.ai_recommendations.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
                                            Рекомендации
                                        </h4>
                                        <ul className="space-y-2">
                                            {result.ai_recommendations.map((rec, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <Sparkles className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                                                    <span className="text-surface-700">{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Warnings */}
                                {result.warnings.length > 0 && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                        <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Предупреждения
                                        </h4>
                                        <ul className="space-y-2">
                                            {result.warnings.map((warning, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                    {warning}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
