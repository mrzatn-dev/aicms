/**
 * API Client for communicating with the backend gateway.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
            }
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
        return this.token;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, headers = {} } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const token = this.getToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        if (response.status === 204) return {} as T;
        return response.json();
    }

    // Auth
    async register(data: { email: string; username: string; password: string; full_name?: string }) {
        return this.request<any>('/api/auth/register', { method: 'POST', body: data });
    }

    async login(data: { email: string; password: string }) {
        return this.request<any>('/api/auth/login', { method: 'POST', body: data });
    }

    async getMe() {
        return this.request<any>('/api/auth/me');
    }

    async getUsers(skip = 0, limit = 50) {
        return this.request<any[]>(`/api/auth/users?skip=${skip}&limit=${limit}`);
    }

    async updateUser(userId: string, data: any) {
        return this.request<any>(`/api/auth/users/${userId}`, { method: 'PUT', body: data });
    }

    async deleteUser(userId: string) {
        return this.request<void>(`/api/auth/users/${userId}`, { method: 'DELETE' });
    }

    async updateProfile(userId: string, data: { full_name?: string; email?: string }) {
        return this.request<any>(`/api/auth/users/${userId}`, { method: 'PUT', body: data });
    }

    logout() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
    }

    // AI Chat
    async chatAI(message: string, history: { role: string; content: string }[] = []) {
        return this.request<{ reply: string }>('/api/ai/chat', {
            method: 'POST',
            body: { message, history },
        });
    }

    // AI Draft Generation
    async generateDraft(data: { topic: string; tone?: string; length?: string }) {
        return this.request<{ draft: string }>('/api/ai/generate/draft', {
            method: 'POST',
            body: data,
        });
    }

    // AI SEO Generation
    async generateSEO(data: { title: string; content: string }) {
        return this.request<{ meta_title: string; meta_description: string; keywords: string[] }>('/api/ai/generate/seo', {
            method: 'POST',
            body: data,
        });
    }

    // AI Content Validation
    async validateContent(data: { title: string; content: string }) {
        return this.request<{ is_valid: boolean; score: number; issues: string[]; suggestions: string[] }>('/api/ai/validate-content', {
            method: 'POST',
            body: data,
        });
    }

    // Document Analysis
    async uploadDocument(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/ai/analyze/document`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // CSV Analysis
    async uploadCSV(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/ai/analyze/csv`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Image Analysis
    async uploadImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/ai/analyze/image`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

}

export const api = new ApiClient(API_URL);
