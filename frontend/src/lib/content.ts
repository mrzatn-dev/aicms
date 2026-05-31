/**
 * Content / articles API types and helpers.
 */

import { api } from './api';

export interface ArticleCategory {
    id: string;
    name: string;
    description?: string | null;
}

export interface ArticleTag {
    id: string;
    name: string;
}

export interface ArticleAIAnalysis {
    category?: string | null;
    tags?: string[] | null;
    toxicity_score?: number | null;
    quality_score?: number | null;
    summary?: string | null;
}

export interface Article {
    id: string;
    title: string;
    content: string;
    cover_image_url?: string | null;
    summary?: string | null;
    author_id: string;
    status: string;
    category?: ArticleCategory | null;
    tags: ArticleTag[];
    ai_analysis?: ArticleAIAnalysis | null;
    created_at: string;
    updated_at: string;
}

export interface ArticleListResponse {
    items: Article[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export type ArticleCreatePayload = {
    title: string;
    content: string;
    category_id?: string | null;
    tags?: string[];
};

export type ArticleUpdatePayload = Partial<ArticleCreatePayload> & {
    status?: string;
};

/** Backend requires min 50 chars for article body. */
export function padArticleContent(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length >= 50) {
        return trimmed;
    }
    const filler = '\n\n—\n\n(Материал подготовлен с помощью AI CMS.)';
    return (trimmed + filler).padEnd(50, '.');
}

export const contentApi = {
    listPublished(params?: { page?: number; search?: string; category_id?: string }) {
        const q = new URLSearchParams();
        q.set('status', 'published');
        if (params?.page) q.set('page', String(params.page));
        if (params?.search) q.set('search', params.search);
        if (params?.category_id) q.set('category_id', params.category_id);
        const query = q.toString();
        return api.requestPublic<ArticleListResponse>(`/api/content${query ? `?${query}` : ''}`);
    },

    listMine(params?: { page?: number; status?: string; search?: string }) {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.status) q.set('status', params.status);
        if (params?.search) q.set('search', params.search);
        const query = q.toString();
        return api.requestAuth<ArticleListResponse>(`/api/content/my${query ? `?${query}` : ''}`);
    },

    /** Admin-only: list articles by status (requires admin JWT). */
    listAdmin(params?: { page?: number; status?: string; search?: string; page_size?: number }) {
        const q = new URLSearchParams();
        if (params?.page) q.set('page', String(params.page));
        if (params?.status) q.set('status', params.status);
        if (params?.search) q.set('search', params.search);
        if (params?.page_size) q.set('page_size', String(params.page_size));
        const query = q.toString();
        return api.requestAuth<ArticleListResponse>(`/api/content${query ? `?${query}` : ''}`);
    },

    uploadCover(articleId: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return api.requestAuth<Article>(`/api/content/${articleId}/image`, {
            method: 'POST',
            body: formData,
        });
    },

    getById(id: string) {
        return api.requestPublic<Article>(`/api/content/${id}`);
    },

    create(payload: ArticleCreatePayload) {
        return api.requestAuth<Article>('/api/content', {
            method: 'POST',
            body: {
                ...payload,
                content: padArticleContent(payload.content),
            },
        });
    },

    update(id: string, payload: ArticleUpdatePayload) {
        const body = { ...payload };
        if (body.content) {
            body.content = padArticleContent(body.content);
        }
        return api.requestAuth<Article>(`/api/content/${id}`, {
            method: 'PUT',
            body,
        });
    },

    delete(id: string) {
        return api.requestAuth<void>(`/api/content/${id}`, { method: 'DELETE' });
    },

    updateStatus(id: string, newStatus: string) {
        return api.requestAuth<Article>(`/api/content/${id}/status?new_status=${encodeURIComponent(newStatus)}`, {
            method: 'PUT',
        });
    },

    listCategories() {
        return api.requestPublic<ArticleCategory[]>('/api/categories');
    },

    listTags() {
        return api.requestPublic<ArticleTag[]>('/api/tags');
    },
};
