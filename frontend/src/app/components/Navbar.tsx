'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, LogOut, LayoutDashboard, Menu, X, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import type { LocaleCode } from '@/app/i18n';
import { LOCALES, getHomePageCopy } from '@/app/i18n';

interface UserInfo {
    id: string;
    username: string;
    full_name: string | null;
    role: string;
}

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [langMenuOpen, setLangMenuOpen] = useState(false);
    const [locale, setLocale] = useState<LocaleCode>('ru');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                } catch { }
            }
            
            const storedLocale = localStorage.getItem('locale') as LocaleCode | null;
            if (storedLocale && LOCALES.includes(storedLocale)) {
                setLocale(storedLocale);
            }
        }
    }, []);

    const handleChangeLocale = (newLocale: LocaleCode) => {
        setLocale(newLocale);
        localStorage.setItem('locale', newLocale);
        setLangMenuOpen(false);
        // Emit custom event for other components to listen
        window.dispatchEvent(new CustomEvent('localeChange', { detail: newLocale }));
    };

    const handleLogout = () => {
        api.logout();
        setUser(null);
        router.push('/');
    };

    return (
        <nav
            className={`fixed w-full top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
                scrolled ? 'nav-scrolled' : 'bg-white/70 border-surface-200/50'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-violet-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-surface-900">AI<span className="text-primary-600">CMS</span></span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {user ? (
                        <>
                            <Link href="/workspace" className="text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors flex items-center gap-1.5">
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Workspace
                            </Link>
                            <div className="flex items-center gap-3 pl-3 border-l border-surface-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">
                                            {(user.full_name || user.username).charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-surface-800">
                                        {user.full_name || user.username}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-surface-700/50 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors">
                                Login
                            </Link>
                            <Link href="/register" className="btn-primary text-sm !px-5 !py-2.5">
                                Get Started
                            </Link>
                            
                            {/* Language Switcher */}
                            {pathname === '/' && (
                                <div className="relative">
                                    <button
                                        onClick={() => setLangMenuOpen(!langMenuOpen)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-100 transition-colors border border-surface-200"
                                    >
                                        <Globe className="w-4 h-4" />
                                        <span className="uppercase font-semibold">{locale}</span>
                                    </button>
                                    {langMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-surface-200 overflow-hidden animate-fade-in z-50">
                                            {LOCALES.map((l) => (
                                                <button
                                                    key={l}
                                                    onClick={() => handleChangeLocale(l)}
                                                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                                                        locale === l
                                                            ? 'bg-primary-50 text-primary-600'
                                                            : 'text-surface-700 hover:bg-surface-50'
                                                    }`}
                                                >
                                                    {getHomePageCopy(l).allLanguages[l]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden p-2 text-surface-700 hover:text-primary-600"
                >
                    {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-surface-200/60 bg-white/95 backdrop-blur-xl animate-fade-in">
                    <div className="px-6 py-4 flex flex-col gap-3">
                        {user ? (
                            <>
                                <Link href="/workspace" className="text-sm font-medium text-surface-700 py-2" onClick={() => setMenuOpen(false)}>
                                    Workspace
                                </Link>
                                <button onClick={handleLogout} className="text-sm font-medium text-red-500 py-2 text-left">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-sm font-medium text-surface-700 py-2" onClick={() => setMenuOpen(false)}>
                                    Login
                                </Link>
                                <Link href="/register" className="btn-primary text-sm !py-2.5 text-center" onClick={() => setMenuOpen(false)}>
                                    Get Started
                                </Link>
                                
                                {/* Language Switcher Mobile */}
                                {pathname === '/' && (
                                    <div className="mt-3 pt-3 border-t border-surface-200">
                                        <button
                                            onClick={() => setLangMenuOpen(!langMenuOpen)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-100 transition-colors border border-surface-200"
                                        >
                                            <Globe className="w-4 h-4" />
                                            <span className="uppercase font-semibold">{locale}</span>
                                        </button>
                                        {langMenuOpen && (
                                            <div className="mt-2 rounded-lg border border-surface-200 overflow-hidden">
                                                {LOCALES.map((l) => (
                                                    <button
                                                        key={l}
                                                        onClick={() => handleChangeLocale(l)}
                                                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                                                            locale === l
                                                                ? 'bg-primary-50 text-primary-600'
                                                                : 'text-surface-700 hover:bg-surface-50'
                                                        }`}
                                                    >
                                                        {getHomePageCopy(l).allLanguages[l]}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
