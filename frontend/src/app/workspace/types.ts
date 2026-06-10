import type { LucideIcon } from 'lucide-react';

export interface UserInfo {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

export type LocaleCode = 'ru' | 'en' | 'kk';

export type ActiveTab =
    | 'home'
    | 'articles'
    | 'pipeline'
    | 'profile'
    | 'history'
    | 'settings'
    | 'subscription'
    | 'statistics'
    | 'admin_control'
    | 'system_monitor'
    | 'support'
    | 'support_admin'
    | 'validate'
    | 'document'
    | 'csv'
    | 'image'
    | 'audio'
    | 'chat';

export interface SidebarItem {
    id: ActiveTab;
    label: string;
    icon: LucideIcon;
    gradient: string;
    category: 'main' | 'ai';
}

export interface QuickAction {
    id: ActiveTab;
    title: string;
    desc: string;
    icon: LucideIcon;
    color: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface SecurityVerdict {
    is_safe: boolean;
    is_content_allowed: boolean;
    is_malware_suspected: boolean;
    verdict: 'safe' | 'warning' | 'blocked';
    summary: string;
    risk_flags: string[];
    scan_engine: string;
}

export interface CSVResult {
    filename: string;
    total_rows: number;
    total_columns: number;
    columns: string[];
    summary: string;
    data_quality: {
        completeness?: number;
        consistency?: number;
        overall?: number;
        details?: string;
    };
    anomalies: string[];
    recommendations: string[];
    warnings: string[];
    missing_values: Record<string, number>;
    security_verdict?: SecurityVerdict;
}

export interface ImageResult {
    filename: string;
    format: string;
    width: number;
    height: number;
    file_size_kb: number;
    color_mode: string;
    has_exif: boolean;
    exif_data: Record<string, string>;
    warnings: string[];
    ai_summary: string;
    ai_recommendations: string[];
    is_suitable: boolean;
    security_verdict?: SecurityVerdict;
}

export interface DocumentResult {
    filename: string;
    file_type: string;
    file_size_kb: number;
    text_length: number;
    word_count: number;
    line_count: number;
    warnings: string[];
    ai_summary: string;
    ai_recommendations: string[];
    content_category: string;
    quality_score: number;
    language: string;
    security_verdict?: SecurityVerdict;
}

export interface ValidationResult {
    is_valid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
}

export interface HistoryItem {
    id: string;
    tool_type: string;
    title?: string | null;
    filename?: string | null;
    input_data?: Record<string, unknown> | null;
    result_data?: Record<string, unknown> | null;
    created_at: string;
}

export interface SettingsFormState {
    chat_system_prompt: string;
    validation_prompt: string;
    document_analysis_prompt: string;
    preferred_model: string;
    temperature: number;
    max_tokens: number;
    theme: string;
    language: string;
    email_notifications: boolean;
    custom_settings: {
        ui_font_size: string;
        compact_mode: boolean;
    };
}

export interface StatisticsData {
    total_analyses?: number;
    analyses_this_week?: number;
    analyses_this_month?: number;
    most_used_tool?: string | null;
    analyses_by_tool?: Array<{
        tool_type: string;
        count: number;
        last_used?: string | null;
    }>;
    recent_activity?: Array<{
        id: string;
        tool_type: string;
        title?: string | null;
        created_at: string;
    }>;
}

export interface AnalyticsLogItem {
    id: string;
    service: string;
    level: string;
    message: string;
    details?: Record<string, unknown> | null;
    created_at: string;
}

export interface SystemMonitorServiceItem {
    name: string;
    url: string;
    status: string;
    http_status?: number | null;
    response_time_ms?: number | null;
    details?: Record<string, unknown> | null;
    error?: string | null;
}

export interface SystemMonitorQueueItem {
    name: string;
    status: string;
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
    consumers: number;
    state: string;
    response_time_ms?: number | null;
    error?: string | null;
}

export interface SystemMonitorRedisStatus {
    status: string;
    host: string;
    db: number;
    connected: boolean;
    latency_ms?: number | null;
    analytics_key_count: number;
    sample_keys: string[];
    error?: string | null;
}

export interface SystemMonitorData {
    generated_at: string;
    summary: {
        healthy_services: number;
        total_services: number;
        queue_backlog: number;
        redis_status: string;
    };
    services: SystemMonitorServiceItem[];
    queues: SystemMonitorQueueItem[];
    redis: SystemMonitorRedisStatus;
}

export interface AdminUserItem extends UserInfo {
    updated_at?: string | null;
    analyses_count: number;
    files_count: number;
    last_activity_at?: string | null;
}

export interface AdminFileItem {
    id: string;
    user_id: string;
    user_name?: string | null;
    user_email?: string | null;
    tool_type: string;
    filename: string;
    title?: string | null;
    file_extension?: string | null;
    file_size_bytes?: number | null;
    file_size_kb?: number | null;
    characteristics: Record<string, unknown>;
    ai_summary?: string | null;
    ai_recommendations: string[];
    warnings: string[];
    security_verdict?: Record<string, unknown> | null;
    created_at: string;
}

export interface AdminToolUsageItem {
    tool_type: string;
    count: number;
    files_count: number;
    last_used?: string | null;
}

export interface AdminOverviewData {
    generated_at: string;
    totals: Record<string, number>;
    tool_usage: AdminToolUsageItem[];
    recent_users: AdminUserItem[];
    recent_files: AdminFileItem[];
    ai_insights: string[];
}

export interface AudioSegment {
    start: number;
    end: number;
    text: string;
    confidence?: number | null;
}

export interface AudioResult {
    id: string;
    user_id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    duration?: number | null;
    file_type: string;
    format: string;
    transcript: string;
    language?: string | null;
    confidence?: number | null;
    segments: AudioSegment[];
    summary?: string | null;
    key_topics: string[];
    sentiment?: Record<string, unknown> | null;
    is_malicious?: boolean;
    safety_score?: number | null;
    safety_summary?: string | null;
    safety_categories: string[];
    security_verdict?: SecurityVerdict;
    processing_time?: number | null;
    model_used?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PipelineStage {
    name: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    started_at?: string | null;
    finished_at?: string | null;
    error?: string | null;
}

export interface PipelineRunItem {
    id: string;
    user_id: string;
    source_type: 'video' | 'audio' | 'image' | 'document' | 'text';
    original_filename?: string | null;
    content_type?: string | null;
    file_size?: number | null;
    status: 'processing' | 'completed' | 'failed';
    current_stage: string;
    stages: PipelineStage[];
    error?: string | null;
    article_id?: string | null;
    transcription_id?: string | null;
    result_meta?: Record<string, unknown>;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface SupportMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_role: 'user' | 'admin';
    message: string;
    created_at: string;
}

export interface SupportConversation {
    id: string;
    user_id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'closed';
    last_message_preview?: string | null;
    created_at: string;
    updated_at: string;
    user_name?: string | null;
    user_email?: string | null;
    messages: SupportMessage[];
}

export interface SupportConversationListItem {
    id: string;
    user_id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'closed';
    last_message_preview?: string | null;
    created_at: string;
    updated_at: string;
    user_name?: string | null;
    user_email?: string | null;
    unread_count?: number;
}
