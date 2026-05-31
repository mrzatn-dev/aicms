'use client';

import type { ReactNode } from 'react';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatInline(text: string): string {
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return safe;
}

interface ArticleBodyProps {
    content: string;
    className?: string;
}

/** Lightweight markdown-style rendering without extra dependencies. */
export function ArticleBody({ content, className = '' }: ArticleBodyProps) {
    const lines = content.split('\n');
    const elements: ReactNode[] = [];
    let listBuffer: string[] = [];

    const flushList = (key: string) => {
        if (listBuffer.length === 0) return;
        elements.push(
            <ul key={key} className="list-disc pl-6 mb-4 space-y-1 text-surface-800">
                {listBuffer.map((item, i) => (
                    <li
                        key={`${key}-${i}`}
                        dangerouslySetInnerHTML={{ __html: formatInline(item) }}
                    />
                ))}
            </ul>,
        );
        listBuffer = [];
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            listBuffer.push(trimmed.slice(2));
            return;
        }

        flushList(`list-${index}`);

        if (!trimmed) {
            elements.push(<br key={`br-${index}`} />);
            return;
        }

        if (trimmed.startsWith('### ')) {
            elements.push(
                <h4
                    key={index}
                    className="text-lg font-semibold text-surface-900 mt-6 mb-2"
                    dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(4)) }}
                />,
            );
            return;
        }

        if (trimmed.startsWith('## ')) {
            elements.push(
                <h3
                    key={index}
                    className="text-xl font-semibold text-surface-900 mt-6 mb-3"
                    dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(3)) }}
                />,
            );
            return;
        }

        if (trimmed.startsWith('# ')) {
            elements.push(
                <h2
                    key={index}
                    className="text-2xl font-bold text-surface-900 mt-6 mb-3"
                    dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }}
                />,
            );
            return;
        }

        elements.push(
            <p
                key={index}
                className="text-surface-800 leading-relaxed mb-4 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatInline(line) }}
            />,
        );
    });

    flushList('list-end');

    return <div className={className}>{elements}</div>;
}
