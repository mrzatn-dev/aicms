'use client';

import { Bot, FileText, BarChart3, Sparkles } from 'lucide-react';

export default function HeroVisual() {
    return (
        <div className="hero-visual" aria-hidden>
            <div className="hero-visual__glow" />

            <svg className="hero-visual__mesh" viewBox="0 0 400 400" fill="none">
                <defs>
                    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                    </linearGradient>
                </defs>
                <circle cx="200" cy="200" r="140" stroke="url(#heroGrad)" strokeWidth="1" className="hero-visual__ring hero-visual__ring--1" />
                <circle cx="200" cy="200" r="100" stroke="url(#heroGrad)" strokeWidth="1" className="hero-visual__ring hero-visual__ring--2" />
                <circle cx="200" cy="200" r="60" stroke="url(#heroGrad)" strokeWidth="1.5" className="hero-visual__ring hero-visual__ring--3" />
            </svg>

            <div className="hero-visual__core">
                <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div className="hero-float-card hero-float-card--tl">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Статья</span>
            </div>
            <div className="hero-float-card hero-float-card--tr">
                <BarChart3 className="w-4 h-4 text-violet-600" />
                <span>Аналитика</span>
            </div>
            <div className="hero-float-card hero-float-card--bl">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>AI</span>
            </div>

            <div className="hero-visual__particles">
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="hero-visual__particle" style={{ '--i': i } as React.CSSProperties} />
                ))}
            </div>
        </div>
    );
}
