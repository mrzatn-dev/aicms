'use client';

import type { RefObject } from 'react';

import { Bot, Loader2, Send } from 'lucide-react';

import { SaveArticleButton } from '../SaveArticleButton';
import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import type { ChatMessage, LocaleCode, UserInfo } from '../../types';

interface ChatTabProps {
    locale: LocaleCode;
    user: UserInfo;
    chatMessages: ChatMessage[];
    chatInput: string;
    chatLoading: boolean;
    chatEndRef: RefObject<HTMLDivElement>;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    onResetChat: () => void;
    onSaveAsArticle?: () => void;
    saveArticleLoading?: boolean;
    canSaveAsArticle?: boolean;
}

export function ChatTab({
    locale,
    user,
    chatMessages,
    chatInput,
    chatLoading,
    chatEndRef,
    onInputChange,
    onSendMessage,
    onResetChat,
    onSaveAsArticle,
    saveArticleLoading,
    canSaveAsArticle,
}: ChatTabProps) {
    const copy = getWorkspaceCopy(locale).chat;
    const localeTag = getLocaleTag(locale);

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
            <div className="workspace-welcome-card rounded-2xl p-4 mb-4 flex items-center gap-3 flex-shrink-0 relative overflow-hidden">
                <div className="workspace-welcome-card__orb workspace-welcome-card__orb--1" style={{ width: 100, height: 100, top: -40, right: -20 }} />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center relative z-10 shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="relative z-10">
                    <h2 className="font-semibold text-surface-900">{copy.title}</h2>
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                        {copy.online}
                    </p>
                </div>
                <div className="ml-auto relative z-10 flex items-center gap-2">
                    {onSaveAsArticle && canSaveAsArticle && (
                        <SaveArticleButton
                            locale={locale}
                            loading={saveArticleLoading}
                            onClick={onSaveAsArticle}
                            className="!py-1.5 !px-2.5 text-xs"
                        />
                    )}
                    <button
                        onClick={onResetChat}
                        className="text-xs text-surface-400 hover:text-surface-700 px-3 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-surface-800/60 transition-colors"
                    >
                        {copy.clear}
                    </button>
                </div>
            </div>

            <div className="card flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {chatMessages.map((message, index) => (
                    <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-sm'
                                : 'bg-surface-100 text-surface-900 rounded-bl-sm'
                        }`}>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-200' : 'text-surface-400'}`}>
                                {message.timestamp.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-xs font-bold text-white">{(user.full_name || user.username).charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                ))}
                {chatLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-surface-100 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1 items-center h-5">
                                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="card mt-4 p-3 flex-shrink-0">
                <div className="flex gap-3 items-end">
                    <textarea
                        value={chatInput}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSendMessage();
                            }
                        }}
                        placeholder={copy.placeholder}
                        rows={1}
                        className="flex-1 resize-none input-field !py-2.5 max-h-32"
                        style={{ overflow: 'auto' }}
                    />
                    <button
                        onClick={onSendMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                        {chatLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
