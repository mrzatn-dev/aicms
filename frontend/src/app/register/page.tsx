'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Zap, Shield, Globe, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { getOAuthStartUrl } from '@/lib/oauth';
import AuthVisual from '@/app/components/AuthVisual';

const FEATURES = [
  { icon: Zap,    label: 'AI-анализ документов и изображений' },
  { icon: Shield, label: 'Роли, права и безопасность' },
  { icon: Globe,  label: 'REST API + микросервисы' },
];

const TRUSTED = ['FastAPI', 'Next.js', 'PostgreSQL', 'OpenAI', 'Docker', 'Redis'];

type Step = 'form' | 'verify';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [form, setForm]         = useState({ email: '', username: '', password: '', full_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.register(form);
      // If backend returns access_token immediately (no email verification yet)
      if (result.access_token) {
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        router.push('/workspace');
      } else if (api.getToken()) {
        router.push('/workspace');
      } else {
        // Backend requires email confirmation
        setRegisteredEmail(form.email);
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = () => {
    window.location.href = getOAuthStartUrl('google');
  };

  /* ── Email verification success screen ── */
  if (step === 'verify') {
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

            <div className="auth-form-body auth-verify-body">
              <div className="auth-verify-icon-wrap">
                <MailCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="auth-heading">Подтвердите email</h1>
              <p className="auth-verify-desc">
                Мы отправили письмо на{' '}
                <strong className="auth-verify-email">{registeredEmail}</strong>.
                <br />
                Перейдите по ссылке в письме для активации аккаунта.
              </p>
              <div className="auth-verify-tips">
                <p className="auth-verify-tip">📬 Не видите письмо? Проверьте папку «Спам»</p>
                <p className="auth-verify-tip">⏱ Ссылка действительна 24 часа</p>
              </div>
              <Link href="/login" className="auth-submit-btn" style={{ display: 'flex', marginTop: '1.5rem' }}>
                Перейти ко входу <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <p className="auth-terms">
              Нужна помощь?{' '}
              <a href="mailto:support@aicms.local" className="auth-terms-link">Написать в поддержку</a>
            </p>
          </div>
        </div>
        <div className="auth-split-right">
          <RightPanel />
        </div>
      </div>
    );
  }

  /* ── Registration form ── */
  return (
    <div className="auth-split-root">
      {/* ─── LEFT: Form ─── */}
      <div className="auth-split-left">
        <div className="auth-form-inner">
          {/* Logo */}
          <Link href="/" className="auth-logo">
            <div className="auth-logo-icon">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="auth-logo-text">AI<span>CMS</span></span>
          </Link>

          <div className="auth-form-body">
            <h1 className="auth-heading">Создать аккаунт</h1>

            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-fields">
              {/* First + Last name row */}
              <div className="auth-name-row">
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="reg-firstname">Имя</label>
                  <input
                    id="reg-firstname"
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Иван"
                    className="auth-input"
                  />
                </div>
                <div className="auth-field-group">
                  <label className="auth-label" htmlFor="reg-username">Username</label>
                  <input
                    id="reg-username"
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="ivan99"
                    required
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="reg-email">Email</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    className="auth-input auth-input--icon-left"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="reg-password">Пароль</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Минимум 6 символов"
                    required
                    minLength={6}
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

              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading}
                className="auth-submit-btn"
              >
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>Зарегистрироваться <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider"><span>или</span></div>

            {/* OAuth */}
            <div className="auth-oauth-stack">
              <button
                id="oauth-google-register-btn"
                type="button"
                onClick={handleOAuth}
                className="auth-oauth-btn"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                </svg>
                Войти через Google
              </button>
            </div>

            <p className="auth-switch-text">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="auth-switch-link">Войти</Link>
            </p>
          </div>

          <p className="auth-terms">
            Создавая аккаунт, вы соглашаетесь с{' '}
            <a href="#" className="auth-terms-link">Условиями использования</a>{' '}
            и{' '}
            <a href="#" className="auth-terms-link">Политикой конфиденциальности</a>
          </p>
        </div>
      </div>

      {/* ─── RIGHT: Dark Panel ─── */}
      <div className="auth-split-right">
        <RightPanel />
      </div>
    </div>
  );
}

/* ── Shared right panel component ── */
function RightPanel() {
  return (
    <>
      <AuthVisual />
      <p className="auth-globe-label">AI-POWERED CMS PLATFORM</p>

      <div className="auth-right-content">
        <h2 className="auth-right-heading">
          УПРАВЛЯЙ КОНТЕНТОМ{' '}
          С ПОМОЩЬЮ ИИ –{' '}
          <span className="auth-right-accent">БЫСТРО</span>{' '}
          И{' '}
          <span className="auth-right-accent">УМНО</span>
        </h2>

        <div className="auth-feature-chips">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="auth-feature-chip">
              <Icon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-trusted">
        <p className="auth-trusted-label">
          <span className="auth-trusted-arrow">▶</span>
          Построено на надёжных технологиях
          <span className="auth-trusted-arrow">◀</span>
        </p>
        <div className="auth-trusted-grid">
          {TRUSTED.map((tech) => (
            <div key={tech} className="auth-trusted-item">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {tech}
            </div>
          ))}
        </div>
      </div>

      <p className="auth-right-footer">
        Нужна помощь?{' '}
        <a href="mailto:support@aicms.local" className="auth-right-footer-link">
          Связаться с поддержкой
        </a>
      </p>
    </>
  );
}
