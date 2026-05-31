'use client';

import { Bot, FileCheck, Sparkles, Zap } from 'lucide-react';

const NODES = [
    { icon: Bot, label: 'NLP', x: '12%', y: '18%', delay: '0s' },
    { icon: FileCheck, label: 'Validate', x: '72%', y: '22%', delay: '0.4s' },
    { icon: Zap, label: 'Fast', x: '78%', y: '58%', delay: '0.8s' },
    { icon: Sparkles, label: 'AI', x: '18%', y: '62%', delay: '1.2s' },
];

export default function AuthVisual() {
    return (
        <div className="auth-visual" aria-hidden>
            <div className="auth-visual__grid" />
            <div className="auth-visual__beam auth-visual__beam--1" />
            <div className="auth-visual__beam auth-visual__beam--2" />

            <div className="auth-visual__hub">
                <div className="auth-visual__hub-ring auth-visual__hub-ring--1" />
                <div className="auth-visual__hub-ring auth-visual__hub-ring--2" />
                <div className="auth-visual__hub-core">
                    <Sparkles className="w-9 h-9 text-white/90" />
                </div>
            </div>

            {NODES.map(({ icon: Icon, label, x, y, delay }) => (
                <div
                    key={label}
                    className="auth-visual__node"
                    style={{ left: x, top: y, animationDelay: delay }}
                >
                    <div className="auth-visual__node-icon">
                        <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span>{label}</span>
                </div>
            ))}

            <svg className="auth-visual__lines" viewBox="0 0 320 280">
                <path d="M160 140 L80 70" className="auth-visual__line" />
                <path d="M160 140 L250 80" className="auth-visual__line auth-visual__line--2" />
                <path d="M160 140 L260 170" className="auth-visual__line auth-visual__line--3" />
                <path d="M160 140 L70 175" className="auth-visual__line auth-visual__line--4" />
            </svg>
        </div>
    );
}
