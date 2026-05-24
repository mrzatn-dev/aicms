'use client';

import { Headset, Loader2, Plus, Send } from 'lucide-react';

import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import type {
    LocaleCode,
    SupportConversation,
    SupportConversationListItem,
    UserInfo,
} from '../../types';

interface SupportCenterTabProps {
    locale: LocaleCode;
    user: UserInfo;
    adminMode?: boolean;
    loading: boolean;
    conversations: SupportConversationListItem[];
    selectedConversationId: string | null;
    selectedConversation: SupportConversation | null;
    draftMessage: string;
    newSubject: string;
    newMessage: string;
    sending: boolean;
    statusUpdating: boolean;
    onSelectConversation: (conversationId: string) => void;
    onDraftMessageChange: (value: string) => void;
    onNewSubjectChange: (value: string) => void;
    onNewMessageChange: (value: string) => void;
    onSendMessage: () => void;
    onCreateConversation: () => void;
    onStatusChange: (status: 'open' | 'in_progress' | 'closed') => void;
}

const statusClassMap = {
    open: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    closed: 'bg-slate-200 text-slate-700',
};

export function SupportCenterTab({
    locale,
    user,
    adminMode = false,
    loading,
    conversations,
    selectedConversationId,
    selectedConversation,
    draftMessage,
    newSubject,
    newMessage,
    sending,
    statusUpdating,
    onSelectConversation,
    onDraftMessageChange,
    onNewSubjectChange,
    onNewMessageChange,
    onSendMessage,
    onCreateConversation,
    onStatusChange,
}: SupportCenterTabProps) {
    const copy = getWorkspaceCopy(locale).support;
    const localeTag = getLocaleTag(locale);
    const showEmptyState = !selectedConversation && conversations.length === 0;

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
                <div className="card overflow-hidden">
                    <div className="p-5 border-b border-surface-200/60">
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${adminMode ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500'}`}>
                                <Headset className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-surface-900">
                                    {adminMode ? copy.inbox : copy.center}
                                </h2>
                                <p className="text-sm text-surface-500">
                                    {adminMode ? copy.inboxSubtitle : copy.centerSubtitle}
                                </p>
                            </div>
                        </div>
                    </div>

                    {!adminMode && (
                        <div className="p-5 border-b border-surface-200/60 bg-surface-50/70 space-y-3">
                            <input
                                type="text"
                                value={newSubject}
                                onChange={(e) => onNewSubjectChange(e.target.value)}
                                placeholder={copy.subject}
                                className="input-field w-full"
                            />
                            <textarea
                                value={newMessage}
                                onChange={(e) => onNewMessageChange(e.target.value)}
                                placeholder={copy.createPlaceholder}
                                rows={4}
                                className="input-field w-full resize-none"
                            />
                            <button
                                onClick={onCreateConversation}
                                disabled={sending || !newSubject.trim() || !newMessage.trim()}
                                className="btn-primary w-full !py-3 disabled:opacity-50 bg-sky-600 hover:bg-sky-700"
                            >
                                {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{copy.creating}</> : <><Plus className="w-4 h-4 mr-2" />{copy.create}</>}
                            </button>
                        </div>
                    )}

                    <div className="max-h-[640px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-center text-sm text-surface-500">
                                {adminMode ? copy.noAdminConversations : copy.noUserConversations}
                            </div>
                        ) : (
                            conversations.map((conversation) => {
                                const isActive = selectedConversationId === conversation.id;
                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => onSelectConversation(conversation.id)}
                                        className={`w-full text-left px-5 py-4 border-b border-surface-100 transition-colors ${
                                            isActive ? 'bg-primary-50' : 'hover:bg-surface-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium text-surface-900 truncate">{conversation.subject}</p>
                                                <p className="text-sm text-surface-500 truncate mt-1">
                                                    {adminMode
                                                        ? `${conversation.user_name || copy.userFallback}${conversation.user_email ? ` • ${conversation.user_email}` : ''}`
                                                        : conversation.last_message_preview || copy.noMessages}
                                                </p>
                                                {!adminMode && conversation.last_message_preview ? (
                                                    <p className="text-xs text-surface-400 truncate mt-1">
                                                        {conversation.last_message_preview}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${statusClassMap[conversation.status]}`}>
                                                    {copy.statuses[conversation.status]}
                                                </span>
                                                {(conversation.unread_count || 0) > 0 && (
                                                    <span className="min-w-[24px] h-6 px-2 rounded-full bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center">
                                                        {(conversation.unread_count || 0) > 99 ? '99+' : conversation.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="card min-h-[640px] flex flex-col overflow-hidden">
                    {showEmptyState ? (
                        <div className="flex-1 flex items-center justify-center text-center p-10">
                            <div>
                                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${adminMode ? 'bg-fuchsia-50' : 'bg-sky-50'}`}>
                                    <Headset className={`w-8 h-8 ${adminMode ? 'text-fuchsia-500' : 'text-sky-500'}`} />
                                </div>
                                <p className="text-lg font-semibold text-surface-900">
                                    {adminMode ? copy.choose : copy.createFirst}
                                </p>
                                <p className="text-sm text-surface-500 mt-2">
                                    {adminMode ? copy.supportReplyHint : copy.conversationHint}
                                </p>
                            </div>
                        </div>
                    ) : !selectedConversation ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-surface-500">
                            {copy.selectConversation}
                        </div>
                    ) : (
                        <>
                            <div className="p-5 border-b border-surface-200/60 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-semibold text-surface-900 truncate">{selectedConversation.subject}</p>
                                    <p className="text-sm text-surface-500 truncate">
                                        {adminMode
                                            ? `${selectedConversation.user_name || copy.userFallback}${selectedConversation.user_email ? ` • ${selectedConversation.user_email}` : ''}`
                                            : `${copy.userLabel}: ${user.full_name || user.username}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2.5 py-1.5 rounded-full ${statusClassMap[selectedConversation.status]}`}>
                                        {copy.statuses[selectedConversation.status]}
                                    </span>
                                    {adminMode && (
                                        <select
                                            value={selectedConversation.status}
                                            onChange={(e) => onStatusChange(e.target.value as 'open' | 'in_progress' | 'closed')}
                                            disabled={statusUpdating}
                                            className="input-field !py-2 !px-3 text-sm min-w-[140px]"
                                        >
                                            <option value="open">{copy.statuses.open}</option>
                                            <option value="in_progress">{copy.statuses.in_progress}</option>
                                            <option value="closed">{copy.statuses.closed}</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-surface-50/30">
                                {selectedConversation.messages.map((message) => {
                                    const isOwn =
                                        adminMode
                                            ? message.sender_role === 'admin'
                                            : message.sender_id === user.id;

                                    return (
                                        <div key={message.id} className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                            {!isOwn && (
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${message.sender_role === 'admin' ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500'}`}>
                                                    <Headset className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                                                isOwn
                                                    ? 'bg-primary-600 text-white rounded-br-sm'
                                                    : 'bg-surface-100 text-surface-900 rounded-bl-sm'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
                                                <p className={`text-xs mt-2 ${isOwn ? 'text-primary-200' : 'text-surface-400'}`}>
                                                    {message.sender_role === 'admin' ? copy.adminLabel : copy.userLabel} • {new Date(message.created_at).toLocaleString(localeTag)}
                                                </p>
                                            </div>
                                            {isOwn && (
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${message.sender_role === 'admin' ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500' : 'bg-gradient-to-br from-primary-500 to-violet-500'}`}>
                                                    <span className="text-xs font-bold text-white">
                                                        {message.sender_role === 'admin' ? 'A' : (user.full_name || user.username).charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t border-surface-200/60 bg-white">
                                <div className="flex gap-3 items-end">
                                    <textarea
                                        value={draftMessage}
                                        onChange={(e) => onDraftMessageChange(e.target.value)}
                                        placeholder={adminMode ? copy.replyAdmin : copy.replyUser}
                                        rows={2}
                                        className="flex-1 resize-none input-field max-h-36"
                                    />
                                    <button
                                        onClick={onSendMessage}
                                        disabled={sending || !draftMessage.trim()}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 ${
                                            adminMode ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500'
                                        }`}
                                    >
                                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
