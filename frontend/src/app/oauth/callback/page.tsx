'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const oauthStatus = searchParams.get('oauth');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (oauthStatus !== 'success') {
      setError('OAuth авторизация не удалась');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    api.getProfile()
      .then((user) => {
        api.markSessionActive(true);
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/workspace');
      })
      .catch(() => {
        setError('Не удалось загрузить профиль после OAuth');
        setTimeout(() => router.push('/login'), 3000);
      });
  }, [searchParams, router]);

  return (
    <>
      {error ? (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>{error}</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Перенаправляем на страницу входа…</p>
        </>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-indigo-500" style={{ animation: 'auth-spin 0.7s linear infinite' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Авторизация…</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Подождите, настраиваем ваш аккаунт</p>
        </>
      )}
    </>
  );
}

function OAuthCallbackFallback() {
  return (
    <>
      <Loader2 className="w-8 h-8 text-indigo-500" style={{ animation: 'auth-spin 0.7s linear infinite' }} />
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Авторизация…</h2>
      <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Подождите, настраиваем ваш аккаунт</p>
    </>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="auth-split-root" style={{ justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1.5rem',
          padding: '2rem',
        }}
      >
        <div className="auth-logo-icon" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem' }}>
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <Suspense fallback={<OAuthCallbackFallback />}>
          <OAuthCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
