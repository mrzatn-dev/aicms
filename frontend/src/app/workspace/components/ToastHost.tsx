'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

type ToastItem = {
    id: number;
    message: string;
    variant: ToastVariant;
};

let pushToast: ((message: string, variant?: ToastVariant) => void) | null = null;

export function showToast(message: string, variant: ToastVariant = 'success') {
    pushToast?.(message, variant);
}

export function ToastHost() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, variant }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4200);
    }, []);

    useEffect(() => {
        pushToast = addToast;
        return () => {
            pushToast = null;
        };
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border animate-fade-in ${
                        toast.variant === 'success'
                            ? 'bg-white border-emerald-200 text-surface-900'
                            : 'bg-white border-red-200 text-surface-900'
                    }`}
                >
                    {toast.variant === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm flex-1">{toast.message}</p>
                    <button
                        type="button"
                        className="text-surface-400 hover:text-surface-700"
                        onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
