'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    Sparkles,
    Upload,
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Lightbulb,
    Info,
    Camera,
    Maximize2,
    HardDrive,
    Palette,
    X,
    Loader2,
    ShieldAlert,
    MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ImageResult {
    filename: string;
    format: string;
    width: number;
    height: number;
    file_size_kb: number;
    color_mode: string;
    has_exif: boolean;
    exif_data: Record<string, string>;
    warnings: string[];
    ai_summary: string;
    ai_recommendations: string[];
    is_suitable: boolean;
}

export default function ImageAnalysisPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImageResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((f: File) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            setError('Неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF, BMP, TIFF');
            return;
        }
        setFile(f);
        setError(null);
        setResult(null);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
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
            const data = await api.uploadImage(file);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Ошибка при анализе изображения');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                        <Link href="/csv" className="text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors">
                            CSV Анализ
                        </Link>
                        <Link href="/articles" className="text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors">
                            Content
                        </Link>
                        <Link href="/admin" className="btn-secondary text-sm !px-4 !py-2">Admin</Link>
                    </div>
                </div>
            </nav>

            <main className="pt-28 pb-16 px-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10 animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-surface-900">Анализ изображений</h1>
                            <p className="text-surface-700/60 text-sm">
                                AI-проверка качества и пригодности изображений
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
                                    ? 'border-rose-400 bg-rose-50/50 shadow-lg shadow-rose-500/10'
                                    : file
                                    ? 'border-emerald-300 bg-emerald-50/30'
                                    : 'border-surface-200 hover:border-rose-300 hover:bg-rose-50/20'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            {preview ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-48 h-48 rounded-2xl overflow-hidden mb-4 shadow-lg">
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-lg font-semibold text-surface-900 mb-1">
                                        {file?.name}
                                    </p>
                                    <p className="text-sm text-surface-700/60">
                                        {file ? (file.size / 1024).toFixed(1) + ' KB' : ''}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                                        <Upload className="w-8 h-8 text-rose-500" />
                                    </div>
                                    <p className="text-lg font-semibold text-surface-900 mb-1">
                                        Перетащите изображение сюда
                                    </p>
                                    <p className="text-sm text-surface-700/60">
                                        JPG, PNG, WebP, GIF, BMP • Максимум 15 MB
                                    </p>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

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
                                <button onClick={handleReset} className="btn-secondary !px-4 !py-3.5">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Header with suitability */}
                        <div className="card p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {preview && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md">
                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-surface-900">{result.filename}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {result.is_suitable ? (
                                            <span className="badge-success flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Подходит для публикации
                                            </span>
                                        ) : (
                                            <span className="badge-danger flex items-center gap-1">
                                                <XCircle className="w-3.5 h-3.5" />
                                                Не рекомендуется
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleReset} className="btn-secondary !px-4 !py-2 text-sm">
                                Новый файл
                            </button>
                        </div>

                        {/* Technical Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="stat-card items-center text-center">
                                <Maximize2 className="w-5 h-5 text-primary-500 mb-1" />
                                <p className="text-lg font-bold text-surface-900">{result.width}×{result.height}</p>
                                <p className="text-xs text-surface-700/60">Разрешение (px)</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <HardDrive className="w-5 h-5 text-primary-500 mb-1" />
                                <p className="text-lg font-bold text-surface-900">
                                    {result.file_size_kb > 1024
                                        ? `${(result.file_size_kb / 1024).toFixed(1)} MB`
                                        : `${result.file_size_kb.toFixed(0)} KB`}
                                </p>
                                <p className="text-xs text-surface-700/60">Размер файла</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <ImageIcon className="w-5 h-5 text-primary-500 mb-1" />
                                <p className="text-lg font-bold text-surface-900">{result.format}</p>
                                <p className="text-xs text-surface-700/60">Формат</p>
                            </div>
                            <div className="stat-card items-center text-center">
                                <Palette className="w-5 h-5 text-primary-500 mb-1" />
                                <p className="text-lg font-bold text-surface-900">{result.color_mode}</p>
                                <p className="text-xs text-surface-700/60">Цветовой режим</p>
                            </div>
                        </div>

                        {/* AI Summary */}
                        {result.ai_summary && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-500" />
                                    AI Оценка
                                </h2>
                                <p className="text-surface-700 leading-relaxed">{result.ai_summary}</p>
                            </div>
                        )}

                        {/* EXIF Data */}
                        {result.has_exif && Object.keys(result.exif_data).length > 0 && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary-500" />
                                    EXIF Метаданные
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(result.exif_data).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                                            {key === 'has_gps' ? (
                                                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            ) : (
                                                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                                            )}
                                            <div>
                                                <p className="text-xs text-surface-700/50">{key.replace(/_/g, ' ')}</p>
                                                <p className="text-sm font-medium text-surface-900">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {result.warnings.length > 0 && (
                            <div className="card p-6 border border-orange-200 bg-orange-50/30">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                                    Предупреждения
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

                        {/* AI Recommendations */}
                        {result.ai_recommendations.length > 0 && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-primary-500" />
                                    AI Рекомендации
                                </h2>
                                <ul className="space-y-2">
                                    {result.ai_recommendations.map((r, i) => (
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
