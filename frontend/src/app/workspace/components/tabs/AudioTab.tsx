'use client';

import type { RefObject } from 'react';

import { AudioLines, Clock3, FileAudio, Lightbulb, Loader2, Sparkles, Upload } from 'lucide-react';

import { getWorkspaceCopy, getLocaleTag } from '../../i18n';
import type { AudioResult, LocaleCode } from '../../types';

interface AudioTabProps {
    locale: LocaleCode;
    audioFile: File | null;
    audioLoading: boolean;
    audioResult: AudioResult | null;
    audioError: string | null;
    audioInputRef: RefObject<HTMLInputElement>;
    onFileSelect: (file: File) => void;
    onAnalyze: () => void;
    onReset: () => void;
}

const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function AudioTab({
    locale,
    audioFile,
    audioLoading,
    audioResult,
    audioError,
    audioInputRef,
    onFileSelect,
    onAnalyze,
    onReset,
}: AudioTabProps) {
    const copy = getWorkspaceCopy(locale).audio;
    const localeTag = getLocaleTag(locale);

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            {!audioResult ? (
                <div className="card p-8">
                    <input
                        ref={audioInputRef}
                        type="file"
                        accept=".mp3,.wav,.m4a,.flac,.aac,.ogg,audio/*"
                        onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }}
                        className="hidden"
                    />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                            <AudioLines className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                            <p className="text-sm text-surface-500">{copy.subtitle}</p>
                        </div>
                    </div>

                    <div
                        onClick={() => audioInputRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            audioFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-surface-300 hover:border-primary-300 hover:bg-primary-50/20'
                        }`}
                    >
                        {audioFile ? (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                    <FileAudio className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-surface-900">{audioFile.name}</p>
                                    <p className="text-sm text-surface-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
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

                    {audioError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-700">{audioError}</p>
                        </div>
                    )}

                    {audioFile && (
                        <button onClick={onAnalyze} disabled={audioLoading} className="btn-primary w-full !py-3.5 disabled:opacity-50 bg-teal-600 hover:bg-teal-700">
                            {audioLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.analyzing}</> : <><Sparkles className="w-5 h-5 mr-2" />{copy.analyze}</>}
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="card p-5 flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                                <FileAudio className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-surface-900">{audioResult.filename}</p>
                                <p className="text-sm text-surface-500">
                                    {audioResult.language || '—'} • {formatDuration(audioResult.duration)}
                                </p>
                            </div>
                        </div>
                        <button onClick={onReset} className="btn-secondary text-sm">{copy.new}</button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4 text-center">
                            <Clock3 className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                            <p className="text-lg font-bold">{formatDuration(audioResult.duration)}</p>
                            <p className="text-xs text-surface-500">{copy.duration}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <FileAudio className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                            <p className="text-lg font-bold uppercase">{audioResult.format}</p>
                            <p className="text-xs text-surface-500">{copy.format}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <AudioLines className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                            <p className="text-lg font-bold">{audioResult.language || '—'}</p>
                            <p className="text-xs text-surface-500">{copy.language}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <Sparkles className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                            <p className="text-lg font-bold">{audioResult.model_used || '—'}</p>
                            <p className="text-xs text-surface-500">{copy.model}</p>
                        </div>
                    </div>

                    {audioResult.summary && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-2">{copy.summary}</h3>
                            <p className="text-surface-700">{audioResult.summary}</p>
                        </div>
                    )}

                    <div className={`card p-6 ${audioResult.is_malicious ? 'border-red-200 bg-red-50/70' : 'border-emerald-200 bg-emerald-50/60'}`}>
                        <h3 className="font-medium text-surface-900 mb-2">{copy.safetyTitle}</h3>
                        <p className={`font-medium ${audioResult.is_malicious ? 'text-red-700' : 'text-emerald-700'}`}>
                            {audioResult.is_malicious ? copy.unsafe : copy.safe}
                        </p>
                        {audioResult.security_verdict?.summary && (
                            <p className="text-sm text-surface-700 mt-2">{audioResult.security_verdict.summary}</p>
                        )}
                        {audioResult.safety_summary && (
                            <p className="text-sm text-surface-700 mt-2">{audioResult.safety_summary}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-surface-600">
                            <span>{copy.riskScore}: {audioResult.safety_score ? `${Math.round(audioResult.safety_score * 100)}%` : '0%'}</span>
                            <span>{copy.riskCategories}: {audioResult.safety_categories?.length ? audioResult.safety_categories.join(', ') : '—'}</span>
                        </div>
                    </div>

                    {audioResult.key_topics.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-primary-500" /> {copy.topics}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {audioResult.key_topics.map((topic) => (
                                    <span key={topic} className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card p-6">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="font-medium text-surface-900">{copy.transcript}</h3>
                            <span className="text-xs text-surface-400">
                                {copy.confidence}: {audioResult.confidence ? `${Math.abs(audioResult.confidence).toFixed(2)}` : '—'}
                            </span>
                        </div>
                        {audioResult.transcript ? (
                            <p className="text-surface-700 whitespace-pre-wrap leading-relaxed">{audioResult.transcript}</p>
                        ) : (
                            <p className="text-surface-500">{copy.noTranscript}</p>
                        )}
                    </div>

                    {audioResult.segments.length > 0 && (
                        <div className="card p-6">
                            <h3 className="font-medium text-surface-900 mb-3">Segments</h3>
                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                {audioResult.segments.map((segment, index) => (
                                    <div key={`${segment.start}-${index}`} className="p-3 rounded-xl bg-surface-50">
                                        <p className="text-xs text-surface-400 mb-1">
                                            {new Date(segment.start * 1000).toLocaleTimeString(localeTag, { minute: '2-digit', second: '2-digit' })}
                                            {' - '}
                                            {new Date(segment.end * 1000).toLocaleTimeString(localeTag, { minute: '2-digit', second: '2-digit' })}
                                        </p>
                                        <p className="text-sm text-surface-700">{segment.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
