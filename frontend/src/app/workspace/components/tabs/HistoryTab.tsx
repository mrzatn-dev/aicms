'use client';

import { ChevronLeft, ChevronRight, Download, History, Loader2, Trash2 } from 'lucide-react';

import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import { formatToolType } from '../../utils';
import type { HistoryItem, LocaleCode } from '../../types';

interface HistoryTabProps {
    locale: LocaleCode;
    historyFilter: string;
    historyLoading: boolean;
    historyItems: HistoryItem[];
    historyPage: number;
    historyTotal: number;
    onFilterChange: (value: string) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onExportPDF: (item: HistoryItem) => void;
    onDeleteHistory: (id: string) => void;
}

export function HistoryTab({
    locale,
    historyFilter,
    historyLoading,
    historyItems,
    historyPage,
    historyTotal,
    onFilterChange,
    onPreviousPage,
    onNextPage,
    onExportPDF,
    onDeleteHistory,
}: HistoryTabProps) {
    const copy = getWorkspaceCopy(locale).history;
    const localeTag = getLocaleTag(locale);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                <select
                    value={historyFilter}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="input-field !py-2 !px-3 text-sm"
                >
                    <option value="all">{copy.filters.all}</option>
                    <option value="chat">{copy.filters.chat}</option>
                    <option value="validation">{copy.filters.validation}</option>
                    <option value="document_analysis">{copy.filters.document_analysis}</option>
                    <option value="csv_analysis">{copy.filters.csv_analysis}</option>
                    <option value="image_analysis">{copy.filters.image_analysis}</option>
                    <option value="audio_transcription">{copy.filters.audio_transcription}</option>
                </select>
            </div>

            {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : historyItems.length === 0 ? (
                <div className="card p-12 text-center">
                    <History className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-surface-500">{copy.empty}</p>
                    <p className="text-sm text-surface-400 mt-1">{copy.emptyHint}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {historyItems.map((item) => (
                            <div key={item.id} className="card p-4 hover:border-primary-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                                            <History className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-surface-900">{formatToolType(item.tool_type, locale)}</p>
                                            <p className="text-sm text-surface-500">
                                                {item.title || item.filename || copy.untitled}
                                            </p>
                                            <p className="text-xs text-surface-400 mt-1">
                                                {new Date(item.created_at).toLocaleString(localeTag)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onExportPDF(item)}
                                            className="p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                            title={copy.exportPdf}
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteHistory(item.id)}
                                            className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title={copy.delete}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {historyTotal > 20 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <button onClick={onPreviousPage} disabled={historyPage === 1} className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-50">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-surface-600">
                                {copy.page} {historyPage} {copy.of} {Math.ceil(historyTotal / 20)}
                            </span>
                            <button onClick={onNextPage} disabled={historyPage >= Math.ceil(historyTotal / 20)} className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-50">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
