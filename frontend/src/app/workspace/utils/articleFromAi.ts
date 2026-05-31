import { padArticleContent } from '@/lib/content';

import type { AudioResult, CSVResult, DocumentResult, ImageResult } from '../types';

export function buildArticleFromCsvResult(result: CSVResult): { title: string; content: string } {
    const parts = [
        result.summary,
        result.recommendations?.length ? `Рекомендации:\n${result.recommendations.join('\n')}` : '',
        result.anomalies?.length ? `Аномалии:\n${result.anomalies.join('\n')}` : '',
    ].filter(Boolean);
    return {
        title: `CSV: ${result.filename}`,
        content: padArticleContent(parts.join('\n\n')),
    };
}

export function buildArticleFromImageResult(result: ImageResult): { title: string; content: string } {
    const parts = [
        result.ai_summary,
        result.ai_recommendations?.length ? `Рекомендации:\n${result.ai_recommendations.join('\n')}` : '',
        `Формат: ${result.format}, ${result.width}×${result.height}, ${result.file_size_kb} KB`,
    ].filter(Boolean);
    return {
        title: `Изображение: ${result.filename}`,
        content: padArticleContent(parts.join('\n\n')),
    };
}

export function buildArticleFromAudioResult(result: AudioResult): { title: string; content: string } {
    const parts = [
        result.summary,
        result.transcript,
        result.key_topics?.length ? `Темы: ${result.key_topics.join(', ')}` : '',
    ].filter(Boolean);
    return {
        title: `Аудио: ${result.original_filename || result.filename}`,
        content: padArticleContent(parts.join('\n\n')),
    };
}

export function buildArticleFromDocumentResult(result: DocumentResult): { title: string; content: string } {
    return {
        title: result.filename,
        content: padArticleContent(
            [result.ai_summary, ...result.ai_recommendations].filter(Boolean).join('\n\n'),
        ),
    };
}
