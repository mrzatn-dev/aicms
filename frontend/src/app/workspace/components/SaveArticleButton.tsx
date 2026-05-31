'use client';

import { Loader2, Newspaper } from 'lucide-react';

import { getArticlesCopy } from '../articles-i18n';
import type { LocaleCode } from '../types';

interface SaveArticleButtonProps {
    locale: LocaleCode;
    disabled?: boolean;
    loading?: boolean;
    onClick: () => void;
    className?: string;
}

export function SaveArticleButton({
    locale,
    disabled,
    loading,
    onClick,
    className = '',
}: SaveArticleButtonProps) {
    const copy = getArticlesCopy(locale);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 transition-colors ${className}`}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Newspaper className="w-4 h-4" />
            )}
            {copy.saveAsArticle}
        </button>
    );
}
