'use client';

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextValue {
    addToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const icons: Record<ToastType, typeof CheckCircle2> = {
        success: CheckCircle2,
        error: XCircle,
        warning: AlertCircle,
        info: Info,
    };

    const colors: Record<ToastType, string> = {
        success: 'border-emerald-400 bg-emerald-50 text-emerald-900',
        error: 'border-red-400 bg-red-50 text-red-900',
        warning: 'border-amber-400 bg-amber-50 text-amber-900',
        info: 'border-blue-400 bg-blue-50 text-blue-900',
    };

    const iconColors: Record<ToastType, string> = {
        success: 'text-emerald-500',
        error: 'text-red-500',
        warning: 'text-amber-500',
        info: 'text-blue-500',
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => {
                    const Icon = icons[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm min-w-[320px] max-w-[420px] animate-slide-up ${colors[toast.type]}`}
                        >
                            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{toast.title}</p>
                                {toast.message && (
                                    <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
