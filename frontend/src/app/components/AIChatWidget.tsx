'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Привет! 👋 Я AI-помощник CMS. Могу помочь с:\n\n• Созданием и редактированием статей\n• Навигацией по системе\n• Советами по улучшению контента\n• Вопросами по SEO и качеству\n\nЗадайте ваш вопрос!',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pulseVisible, setPulseVisible] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Hide pulse after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => setPulseVisible(false), 10000);
        return () => clearTimeout(timer);
    }, []);

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { role: 'user', content: input.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            // Send history (skip the initial greeting)
            const history = updatedMessages
                .slice(1)
                .map((m) => ({ role: m.role, content: m.content }));

            const result = await api.chatAI(userMessage.content, history);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: result.reply },
            ]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Извините, произошла ошибка. Попробуйте ещё раз позже.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Chat Panel */}
            <div
                className={`fixed bottom-24 right-6 z-[9999] transition-all duration-500 ease-out ${isOpen
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                    }`}
            >
                <div className="w-[400px] max-h-[600px] bg-white rounded-2xl shadow-2xl shadow-black/15 border border-surface-200/60 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-violet-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">AI Помощник</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-white/70 text-xs">Онлайн</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[400px] min-h-[300px]"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#e2e8f0 transparent',
                        }}
                    >
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
                            >
                                {/* Avatar */}
                                <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant'
                                            ? 'bg-gradient-to-br from-primary-500 to-violet-500'
                                            : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                                        }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <User className="w-3.5 h-3.5 text-white" />
                                    )}
                                </div>

                                {/* Bubble */}
                                <div
                                    className={`max-w-[280px] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant'
                                            ? 'bg-surface-100 text-surface-800 rounded-tl-md'
                                            : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-md'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <div className="flex gap-2.5 animate-fade-in">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="bg-surface-100 px-4 py-3 rounded-2xl rounded-tl-md">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-surface-200/60 px-4 py-3 flex-shrink-0">
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Задайте вопрос..."
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-400 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-40 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </form>
                        <p className="text-[10px] text-surface-400 text-center mt-2">
                            Powered by DeepSeek AI • CMS AI Helper
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setPulseVisible(false);
                }}
                className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-primary-500/40 active:translate-y-0 ${isOpen
                        ? 'bg-surface-800 rotate-0 shadow-surface-800/30'
                        : 'bg-gradient-to-r from-primary-600 to-violet-500 shadow-primary-500/30'
                    }`}
            >
                {/* Pulse ring */}
                {!isOpen && pulseVisible && (
                    <span className="absolute inset-0 rounded-2xl bg-primary-500/30 animate-ping" />
                )}

                {isOpen ? (
                    <X className="w-6 h-6 text-white transition-transform duration-300" />
                ) : (
                    <MessageCircle className="w-6 h-6 text-white transition-transform duration-300" />
                )}
            </button>
        </>
    );
}
