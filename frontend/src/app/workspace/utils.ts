import type { LocaleCode } from './types';

export const formatToolType = (type: string, locale: LocaleCode = 'ru') => {
    const maps: Record<LocaleCode, Record<string, string>> = {
        ru: {
            chat: 'AI Чат',
            validation: 'Проверка контента',
            document_analysis: 'Анализ документа',
            csv_analysis: 'Анализ CSV',
            image_analysis: 'Анализ изображения',
            audio_transcription: 'Анализ аудио',
        },
        en: {
            chat: 'AI Chat',
            validation: 'Content validation',
            document_analysis: 'Document analysis',
            csv_analysis: 'CSV analysis',
            image_analysis: 'Image analysis',
            audio_transcription: 'Audio analysis',
        },
        kk: {
            chat: 'AI Чат',
            validation: 'Контентті тексеру',
            document_analysis: 'Құжат талдауы',
            csv_analysis: 'CSV талдауы',
            image_analysis: 'Сурет талдауы',
            audio_transcription: 'Аудио талдауы',
        },
    };

    return maps[locale]?.[type] || type;
};

export const qualityColor = (score?: number) => {
    if (!score) return 'text-surface-700/50';
    if (score >= 0.8) return 'text-emerald-600';
    if (score >= 0.5) return 'text-amber-600';
    return 'text-red-600';
};

export const qualityPercent = (score?: number) => {
    if (!score) return '—';
    return `${(score * 100).toFixed(0)}%`;
};
