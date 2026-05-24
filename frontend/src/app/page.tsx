'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    MessageSquare, FileCheck, FileText, FileSpreadsheet, Image as ImageIcon,
    Sparkles, ArrowRight, CheckCircle2, Bot, Upload,
    BarChart3, AudioLines
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { getHomePageCopy, LOCALES } from '@/app/i18n';
import type { LocaleCode } from '@/app/i18n';

export default function HomePage() {
    const [locale, setLocale] = useState<LocaleCode>('ru');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedLocale = localStorage.getItem('locale') as LocaleCode | null;
            if (storedLocale && LOCALES.includes(storedLocale)) {
                setLocale(storedLocale);
            }

            const handleLocaleChange = (event: Event) => {
                const customEvent = event as CustomEvent<LocaleCode>;
                setLocale(customEvent.detail);
            };

            window.addEventListener('localeChange', handleLocaleChange);
            return () => window.removeEventListener('localeChange', handleLocaleChange);
        }
    }, []);

    const copy = getHomePageCopy(locale);

    const toolsConfig = [
        {
            icon: MessageSquare,
            key: 'chat',
            gradient: 'from-emerald-500 to-teal-600',
        },
        {
            icon: FileCheck,
            key: 'validate',
            gradient: 'from-amber-500 to-orange-600',
        },
        {
            icon: FileText,
            key: 'document',
            gradient: 'from-indigo-500 to-violet-600',
        },
        {
            icon: FileSpreadsheet,
            key: 'csv',
            gradient: 'from-rose-500 to-pink-600',
        },
        {
            icon: ImageIcon,
            key: 'image',
            gradient: 'from-cyan-500 to-blue-600',
        },
        {
            icon: AudioLines,
            key: 'audio',
            gradient: 'from-purple-500 to-pink-600',
        },
    ];

    const stepsConfig = [
        {
            icon: Upload,
            key: 'upload',
        },
        {
            icon: Bot,
            key: 'process',
        },
        {
            icon: BarChart3,
            key: 'receive',
        },
    ];

    const allianceRibbonByLocale: Record<LocaleCode, string[]> = {
        ru: [
            'Союз финтех-компаний',
            'Зеленая энергетика',
            'Медтех-лаборатории',
            'Умная логистика',
            'EdTech-партнерство',
            'GovTech-экосистема',
            'Аэрокосмические решения',
        ],
        kk: [
            'Қаржы технологиялары одағы',
            'Жасыл энергетика',
            'MedTech зертханалары',
            'Ақылды логистика',
            'EdTech серіктестігі',
            'GovTech экожүйесі',
            'Аэроғарыш шешімдері',
        ],
        en: [
            'Future FinTech Alliance',
            'Green Energy',
            'MedTech Labs',
            'Smart Logistics',
            'EdTech Partnership',
            'GovTech Ecosystem',
            'Aerospace Solutions',
        ],
    };
    const allianceRibbon = allianceRibbonByLocale[locale];

    return (
        <div className="min-h-screen bg-surface-50">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-transparent"></div>
                <div className="hero-grid-mask"></div>
                <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl"></div>
                <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl"></div>
                <div className="hero-orbit hero-orbit-lg"></div>
                <div className="hero-orbit hero-orbit-sm"></div>

                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-full mb-8 animate-fade-in">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">{copy.tagline}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-surface-900 mb-6 leading-tight animate-slide-up">
                        {copy.mainTitle}
                        <br />
                        <span className="bg-gradient-to-r from-emerald-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent">
                            {copy.mainTitleHighlight}
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-surface-700/80 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        {copy.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <Link href="/register" className="btn-primary text-base !px-8 !py-4">
                            {copy.startFree}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                        <Link href="/login" className="btn-secondary text-base !px-8 !py-4">
                            {copy.login}
                        </Link>
                    </div>

                </div>
            </section>

            {/* Alliance Ribbon */}
            <section className="px-6 pb-8 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <div className="alliance-ribbon">
                        <div className="alliance-ribbon-track">
                            {[...allianceRibbon, ...allianceRibbon].map((item, index) => (
                                <span key={`${item}-${index}`} className="alliance-ribbon-item">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Tools Grid */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mb-4">
                            {copy.aiTools}
                        </h2>
                            <p className="text-surface-700/70 max-w-xl mx-auto">
                            {copy.aiToolsDescription}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {toolsConfig.map((tool) => {
                            const toolCopy = copy.tools[tool.key as keyof typeof copy.tools];
                            return (
                                <div
                                    key={tool.key}
                                    className="card p-8 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300 bg-white"
                                >
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                                        <tool.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-surface-900 mb-2">{toolCopy.title}</h3>
                                    <p className="text-sm text-surface-700/70 leading-relaxed">{toolCopy.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-white to-surface-50">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mb-6">
                                {copy.whyOurAi}
                            </h2>
                            <p className="text-surface-700/80 mb-8 leading-relaxed">
                                {copy.whyDescription}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {copy.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-sm text-surface-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-violet-400/20 rounded-3xl blur-2xl"></div>
                            <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-surface-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-surface-900">{copy.aiAssistant}</p>
                                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> {copy.online}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-surface-100 rounded-xl rounded-bl-sm p-4 max-w-[80%]">
                                        <p className="text-sm text-surface-900">{copy.hello}</p>
                                    </div>
                                    <div className="bg-primary-600 rounded-xl rounded-br-sm p-4 max-w-[80%] ml-auto">
                                        <p className="text-sm text-white">{copy.analyzeThis}</p>
                                    </div>
                                    <div className="bg-surface-100 rounded-xl rounded-bl-sm p-4 max-w-[80%]">
                                        <p className="text-sm text-surface-900">{copy.sureHelpful}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <div className="flex-1 bg-surface-100 rounded-xl px-4 py-3 text-sm text-surface-400">
                                        {copy.enterMessage}
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 bg-surface-100">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 mb-4">
                            {copy.howItWorks}
                        </h2>
                        <p className="text-surface-700/70 max-w-xl mx-auto">
                            {copy.howItWorksDescription}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {stepsConfig.map((step) => {
                            const stepCopy = copy.steps[step.key as keyof typeof copy.steps];
                            return (
                                <div key={step.key} className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                        <step.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <span className="text-5xl font-bold text-surface-200/50">{stepCopy.number}</span>
                                    <h3 className="text-lg font-semibold text-surface-900 mt-2 mb-2">{stepCopy.title}</h3>
                                    <p className="text-sm text-surface-700/70">{stepCopy.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="card p-12 bg-gradient-to-br from-emerald-500 to-violet-600 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        
                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                {copy.ready}
                            </h2>
                            <p className="text-white/80 mb-8 max-w-lg mx-auto">
                                {copy.createAccount}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register" className="inline-flex items-center justify-center px-8 py-4 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-white/90 transition-colors">
                                    {copy.startFree}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Link>
                                <Link href="/login" className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/30">
                                    {copy.login}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-surface-200/60 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-violet-500 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold text-surface-900">AI<span className="text-emerald-600">Tools</span></span>
                        </div>
                        <p className="text-sm text-surface-700/60">© 2024 AI-инструменты для работы с контентом.</p>
                        <div className="flex gap-6">
                            <Link href="/workspace" className="text-sm text-surface-700/60 hover:text-emerald-600 transition-colors">Workspace</Link>
                            <Link href="/login" className="text-sm text-surface-700/60 hover:text-emerald-600 transition-colors">{copy.login}</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
