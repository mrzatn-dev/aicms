'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import AuthVisual from '@/app/components/AuthVisual';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    if (!token) {
      setError('Ссылка недействительна');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      router.push('/login?reset=success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-body">
      <h1 className="auth-heading">Новый пароль</h1>

      {error && <div className="auth-error"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="auth-fields">
        <div className="auth-field-group">
          <label className="auth-label" htmlFor="new-password">Новый пароль</label>
          <div className="auth-input-wrap">
            <Lock className="auth-input-icon" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="auth-input auth-input--icon-left auth-input--icon-right"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="auth-eye-btn"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="auth-field-group">
          <label className="auth-label" htmlFor="confirm-password">Повторите пароль</label>
          <div className="auth-input-wrap">
            <Lock className="auth-input-icon" />
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              className="auth-input auth-input--icon-left"
            />
          </div>
        </div>
        <button type="submit" disabled={loading || !token} className="auth-submit-btn">
          {loading ? <span className="auth-spinner" /> : <>Сохранить пароль <ArrowRight className="w-4 h-4 ml-1" /></>}
        </button>
      </form>

      <p className="auth-switch-text">
        <Link href="/login" className="auth-switch-link">Войти</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-split-root">
      <div className="auth-split-left">
        <div className="auth-form-inner">
          <Link href="/" className="auth-logo">
            <div className="auth-logo-icon">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="auth-logo-text">AI<span>CMS</span></span>
          </Link>
          <Suspense fallback={<div className="auth-form-body">Загрузка…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
      <div className="auth-split-right">
        <AuthVisual />
        <p className="auth-globe-label">AI-POWERED CMS PLATFORM</p>
      </div>
    </div>
  );
}
