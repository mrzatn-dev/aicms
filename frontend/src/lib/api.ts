/**
 * API Client for communicating with the backend gateway.
 */

import { getApiBaseUrl } from './oauth';

interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

class ApiClient {
    private sessionActive = false;
    private interfaceLanguage: string | null = null;

    private get baseUrl(): string {
        return getApiBaseUrl();
    }

    /** @deprecated Auth uses HttpOnly cookies; kept for compatibility. */
    setToken(_token: string | null) {
        this.sessionActive = !!_token;
        if (typeof window !== 'undefined' && !_token) {
            localStorage.removeItem('auth_token');
        }
    }

    /** @deprecated Auth uses HttpOnly cookies. */
    getToken(): string | null {
        return this.sessionActive ? 'cookie' : null;
    }

    markSessionActive(active = true) {
        this.sessionActive = active;
    }

    async ensureSession(): Promise<boolean> {
        try {
            await this.getProfile();
            this.sessionActive = true;
            return true;
        } catch {
            this.sessionActive = false;
            return false;
        }
    }

    setInterfaceLanguage(language: string | null) {
        this.interfaceLanguage = language;
        if (typeof window !== 'undefined') {
            if (language) {
                localStorage.setItem('interface_language', language);
            } else {
                localStorage.removeItem('interface_language');
            }
        }
    }

    getInterfaceLanguage(): string | null {
        if (this.interfaceLanguage) return this.interfaceLanguage;
        if (typeof window !== 'undefined') {
            this.interfaceLanguage = localStorage.getItem('interface_language');
        }
        return this.interfaceLanguage;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, headers = {} } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const interfaceLanguage = this.getInterfaceLanguage();
        if (interfaceLanguage) {
            requestHeaders['X-Interface-Language'] = interfaceLanguage;
        }

        // Remove Content-Type for FormData
        if (body instanceof FormData) {
            delete requestHeaders['Content-Type'];
        }

        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                credentials: 'include',
                body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                const errorDetail = error.detail || `HTTP ${response.status}`;
                if (response.status === 401) {
                    this.sessionActive = false;
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('user');
                    }
                    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
                }
                throw new Error(errorDetail);
            }

            const text = await response.text();
            if (!text) {
                return {} as T;
            }
            try {
                return JSON.parse(text) as T;
            } catch {
                // Cookie auth may still succeed even if the JSON body was truncated in transit.
                if (response.status >= 200 && response.status < 300) {
                    this.markSessionActive(true);
                    return {} as T;
                }
                throw new Error('Invalid server response');
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ─── Auth API ───────────────────────────────────────────
    async login(email: string, password: string) {
        const response = await this.request<any>('/api/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        this.markSessionActive(true);
        return response;
    }

    async register(userData: {
        email: string;
        username: string;
        password: string;
        full_name: string;
    }) {
        const response = await this.request<any>('/api/auth/register', {
            method: 'POST',
            body: userData,
        });
        this.markSessionActive(true);
        return response;
    }

    async logout() {
        try {
            await this.request<any>('/api/auth/logout', { method: 'POST' });
        } catch {
            // Clear local session even if the server call fails.
        }
        this.markSessionActive(false);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
        }
    }

    async getProfile() {
        return this.request<any>('/api/auth/profile');
    }

    async updateProfile(userId: string, data: { full_name?: string; email?: string }) {
        return this.request<any>(`/api/auth/profile`, {
            method: 'PUT',
            body: data,
        });
    }

    async updateUser(userId: string, data: { full_name?: string; email?: string; role?: string; is_active?: boolean }) {
        return this.request<any>(`/api/auth/users/${userId}`, {
            method: 'PUT',
            body: data,
        });
    }

    async deleteUser(userId: string) {
        return this.request<void>(`/api/auth/users/${userId}`, {
            method: 'DELETE',
        });
    }

    // ─── AI API ───────────────────────────────────────────────
    async chatAI(message: string, history: Array<{ role: string; content: string }>, language = 'ru') {
        return this.request<any>('/api/ai/chat', {
            method: 'POST',
            body: { message, history, language },
        });
    }

    async chatAIStream(
        message: string,
        history: Array<{ role: string; content: string }>,
        language = 'ru',
        onDelta?: (delta: string) => void,
    ): Promise<string> {
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const interfaceLanguage = this.getInterfaceLanguage();
        if (interfaceLanguage) {
            requestHeaders['X-Interface-Language'] = interfaceLanguage;
        }

        const response = await fetch(`${this.baseUrl}/api/ai/chat/stream`, {
            method: 'POST',
            headers: requestHeaders,
            credentials: 'include',
            body: JSON.stringify({ message, history, language }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Streaming not supported');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.delta) {
                        fullReply += parsed.delta;
                        onDelta?.(parsed.delta);
                    }
                } catch {
                    // ignore malformed SSE chunks
                }
            }
        }

        return fullReply;
    }

    async validateContent(data: { title: string; content: string; language?: string }) {
        // Quick AI moderation check (profanity / threats / self-harm etc.)
        // Proxied to ai-service POST /validate-content via API Gateway
        return this.request<any>('/api/ai/validate-content', {
            method: 'POST',
            body: data,
        });
    }

    async uploadDocument(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        // Proxy to ai-service /analyze/document via API Gateway
        return this.request<any>('/api/ai/analyze/document', {
            method: 'POST',
            body: formData,
        });
    }

    async uploadCSV(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        // Proxy to ai-service /analyze/csv via API Gateway
        return this.request<any>('/api/ai/analyze/csv', {
            method: 'POST',
            body: formData,
        });
    }

    async uploadImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        // Proxy to ai-service /analyze/image via API Gateway
        return this.request<any>('/api/ai/analyze/image', {
            method: 'POST',
            body: formData,
        });
    }

    // ─── Transcription API ───────────────────────────────────────
    async transcribeAudio(file: File, language = 'ru') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('response_language', language);
        
        return this.request<any>('/api/transcription/transcribe', {
            method: 'POST',
            body: formData,
        });
    }

    async getTranscriptions(page = 1, pageSize = 20, fileType?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        
        if (fileType) {
            params.append('file_type', fileType);
        }
        
        return this.request<any>(`/api/transcription/transcriptions?${params}`);
    }

    async getTranscription(id: string) {
        return this.request<any>(`/api/transcription/transcriptions/${id}`);
    }

    async updateTranscription(id: string, data: any) {
        return this.request<any>(`/api/transcription/transcriptions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    }

    async deleteTranscription(id: string) {
        return this.request<void>(`/api/transcription/transcriptions/${id}`, {
            method: 'DELETE',
        });
    }

    async getTranscriptionStats() {
        return this.request<any>('/api/transcription/transcriptions/stats');
    }

    // ─── User History API ───────────────────────────────────────
    async getHistory(page = 1, pageSize = 20, toolType?: string) {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (toolType) params.append('tool_type', toolType);
        return this.request<any>(`/api/user/history?${params}`);
    }

    async getHistoryItem(historyId: string) {
        return this.request<any>(`/api/user/history/${historyId}`);
    }

    async createHistory(data: {
        tool_type: string;
        input_data?: any;
        result_data?: any;
        filename?: string;
        title?: string;
    }) {
        return this.request<any>('/api/user/history', { method: 'POST', body: data });
    }

    async deleteHistoryItem(historyId: string) {
        return this.request<void>(`/api/user/history/${historyId}`, { method: 'DELETE' });
    }

    // ─── User Settings API ───────────────────────────────────────
    async getSettings() {
        return this.request<any>('/api/user/settings');
    }

    async updateSettings(data: {
        chat_system_prompt?: string;
        validation_prompt?: string;
        document_analysis_prompt?: string;
        preferred_model?: string;
        temperature?: number;
        max_tokens?: number;
        theme?: string;
        language?: string;
        email_notifications?: boolean;
        custom_settings?: any;
    }) {
        return this.request<any>('/api/user/settings', { method: 'PUT', body: data });
    }

    // ─── User Statistics API ───────────────────────────────────────
    async getStatistics() {
        return this.request<any>('/api/user/statistics');
    }

    // ─── Analytics API ─────────────────────────────────────────────
    async getAnalyticsLogs(limit = 20, serviceName?: string, level?: string) {
        const params = new URLSearchParams({
            skip: '0',
            limit: limit.toString(),
        });
        if (serviceName) params.append('service_name', serviceName);
        if (level) params.append('level', level);
        return this.request<any>(`/api/analytics/logs?${params}`);
    }

    async getSystemMonitor() {
        return this.request<any>('/api/analytics/system-monitor');
    }

    // ─── Admin Control API ─────────────────────────────────────────
    async getAdminOverview() {
        return this.request<any>('/api/admin/overview');
    }

    async getAdminUsers(page = 1, pageSize = 20, search?: string, role?: string, isActive?: boolean) {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        if (search) params.append('search', search);
        if (role && role !== 'all') params.append('role', role);
        if (typeof isActive === 'boolean') params.append('is_active', String(isActive));
        return this.request<any>(`/api/admin/users?${params}`);
    }

    async getAdminFiles(page = 1, pageSize = 20, toolType?: string, search?: string, userId?: string) {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        if (toolType && toolType !== 'all') params.append('tool_type', toolType);
        if (search) params.append('search', search);
        if (userId) params.append('user_id', userId);
        return this.request<any>(`/api/admin/files?${params}`);
    }

    // ─── Support API ─────────────────────────────────────────────
    async createSupportConversation(data: { subject: string; message: string }) {
        return this.request<any>('/api/user/support/conversations', {
            method: 'POST',
            body: data,
        });
    }

    async getSupportConversations() {
        return this.request<any>('/api/user/support/conversations');
    }

    async getSupportConversation(conversationId: string) {
        return this.request<any>(`/api/user/support/conversations/${conversationId}`);
    }

    async sendSupportMessage(conversationId: string, data: { message: string }) {
        return this.request<any>(`/api/user/support/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: data,
        });
    }

    async getAdminSupportConversations() {
        return this.request<any>('/api/admin/support/conversations');
    }

    async getAdminSupportConversation(conversationId: string) {
        return this.request<any>(`/api/admin/support/conversations/${conversationId}`);
    }

    async sendAdminSupportMessage(conversationId: string, data: { message: string }) {
        return this.request<any>(`/api/admin/support/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: data,
        });
    }

    async updateAdminSupportStatus(conversationId: string, data: { status: string }) {
        return this.request<any>(`/api/admin/support/conversations/${conversationId}/status`, {
            method: 'PUT',
            body: data,
        });
    }
}

export const api = new ApiClient();
