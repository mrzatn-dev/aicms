import type { HistoryItem } from '../types';
import { padArticleContent } from '@/lib/content';

export function buildArticleFromHistory(item: HistoryItem): { title: string; content: string } | null {
    const title = (item.title || item.filename || 'AI результат').slice(0, 200);
    const rd = item.result_data;
    if (!rd || typeof rd !== 'object') {
        return null;
    }

    const parts: string[] = [];
    const push = (v: unknown) => {
        if (typeof v === 'string' && v.trim()) {
            parts.push(v.trim());
        }
    };

    push((rd as Record<string, unknown>).summary);
    push((rd as Record<string, unknown>).ai_summary);
    push((rd as Record<string, unknown>).transcript);
    push((rd as Record<string, unknown>).content);

    const recs = (rd as Record<string, unknown>).ai_recommendations;
    if (Array.isArray(recs) && recs.length) {
        parts.push('Рекомендации:\n' + recs.map(String).join('\n'));
    }

    const suggestions = (rd as Record<string, unknown>).suggestions;
    if (Array.isArray(suggestions) && suggestions.length) {
        parts.push('Предложения:\n' + suggestions.map(String).join('\n'));
    }

    let content = parts.join('\n\n');
    if (!content) {
        try {
            content = JSON.stringify(rd, null, 2);
        } catch {
            return null;
        }
    }

    return { title, content: padArticleContent(content) };
}
