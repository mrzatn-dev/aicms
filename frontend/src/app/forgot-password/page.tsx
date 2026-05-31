'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import AuthVisual from '@/app/components/AuthVisual';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setSuccess(result.detail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="auth-form-body">
            <h1 className="auth-heading">Сброс пароля</h1>
            <p className="text-sm text-surface-500 mb-4">
              Укажите email — мы отправим ссылку для нового пароля.
            </p>

            {error && <div className="auth-error"><span>{error}</span></div>}
            {success && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 mb-4">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="auth-fields">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="forgot-email">Email</label>
                  <div className="auth-input-wrap">
                    <Mail className="auth-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="auth-input auth-input--icon-left"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="auth-submit-btn">
                  {loading ? <span className="auth-spinner" /> : <>Отправить ссылку <ArrowRight className="w-4 h-4 ml-1" /></>}
                </button>
              </form>
            )}

            <p className="auth-switch-text">
              <Link href="/login" className="auth-switch-link">Вернуться ко входу</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-split-right">
        <AuthVisual />
        <p className="auth-globe-label">AI-POWERED CMS PLATFORM</p>
        <div className="auth-right-content">
          <h2 className="auth-right-heading">
            ВОССТАНОВИТЕ ДОСТУП{' '}
            <span className="auth-right-accent">БЕЗОПАСНО</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
