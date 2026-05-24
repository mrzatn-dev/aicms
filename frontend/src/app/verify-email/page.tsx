'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен подтверждения не найден');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/verify-email?token=${token}`
        );
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          // Auto-redirect after 3s
          setTimeout(() => router.push('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Ссылка недействительна или устарела');
        }
      } catch {
        setStatus('error');
        setMessage('Ошибка сервера. Попробуйте позже.');
      }
    };

    verify();
  }, [token, router]);

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
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h1 className="auth-heading">Проверяем ссылку…</h1>
                <p className="auth-verify-desc">Подождите, идёт подтверждение email</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="auth-verify-icon-wrap" style={{ background: 'linear-gradient(135deg,rgba(52,211,153,.15),rgba(16,185,129,.08))' }}>
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="auth-heading">Email подтверждён!</h1>
                <p className="auth-verify-desc">
                  Ваш аккаунт успешно активирован.<br />
                  Перенаправляем на страницу входа…
                </p>
                <Link href="/login" className="auth-submit-btn" style={{ display: 'flex', marginTop: '1.5rem' }}>
                  Войти сейчас <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="auth-verify-icon-wrap" style={{ background: 'rgba(239,68,68,.08)', border: '1.5px solid rgba(239,68,68,.2)' }}>
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="auth-heading">Ошибка подтверждения</h1>
                <p className="auth-verify-desc">{message}</p>
                <div className="auth-verify-tips">
                  <p className="auth-verify-tip">🔁 Попробуйте зарегистрироваться заново</p>
                  <p className="auth-verify-tip">⏱ Ссылка действительна 24 часа</p>
                </div>
                <Link href="/register" className="auth-submit-btn" style={{ display: 'flex', marginTop: '1.5rem' }}>
                  Зарегистрироваться снова <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right dark panel */}
      <div className="auth-split-right">
        <div className="auth-globe-wrap">
          <div className="auth-globe">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="auth-globe-ring" style={{ '--ring-i': i } as any} />
            ))}
            <div className="auth-globe-center">
              <Sparkles className="w-8 h-8 text-white/80" />
            </div>
          </div>
          <p className="auth-globe-label">AI-POWERED CMS PLATFORM</p>
        </div>

        <div className="auth-right-content">
          <h2 className="auth-right-heading">
            ОДИН ШАГ ДО{' '}
            <span className="auth-right-accent">УМНОЙ</span>{' '}
            РАБОТЫ С КОНТЕНТОМ
          </h2>
        </div>

        <p className="auth-right-footer">
          Нужна помощь?{' '}
          <a href="mailto:support@aicms.local" className="auth-right-footer-link">
            Написать в поддержку
          </a>
        </p>
      </div>
    </div>
  );
}
