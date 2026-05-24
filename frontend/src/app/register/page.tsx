'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await api.register(form);
            api.setToken(result.access_token);
            localStorage.setItem('user', JSON.stringify(result.user));
            router.push('/workspace');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-primary-50 via-white to-violet-50">
            <div className="absolute top-10 left-10">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold">AI<span className="text-primary-600">CMS</span></span>
                </Link>
            </div>

            <div className="w-full max-w-md animate-slide-up">
                <div className="card p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                            <UserPlus className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-surface-900">Create Account</h1>
                        <p className="text-sm text-surface-700/60 mt-1">Join the AI-powered CMS platform</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700/40" />
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    className="input-field !pl-11"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700/40" />
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="johndoe"
                                    required
                                    className="input-field !pl-11"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700/40" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="john@example.com"
                                    required
                                    className="input-field !pl-11"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Min 6 characters"
                                    required
                                    minLength={6}
                                    className="input-field !pl-11 !pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-700/40 hover:text-surface-700"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 disabled:opacity-60 !mt-6">
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-surface-700/60 mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
