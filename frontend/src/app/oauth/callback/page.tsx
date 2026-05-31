'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Sparkles, XCircle } from 'lucide-react';

import '@/app/workspace/workspace.css';

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

  if (error) {
    return (
      <>
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-2">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-red-600 text-center">{error}</h2>
        <p className="text-sm text-surface-500 text-center">Перенаправляем на страницу входа…</p>
      </>
    );
  }

  return (
    <>
      <div className="workspace-loader mb-2" />
      <h2 className="text-xl font-semibold text-surface-900 workspace-topbar-title">Авторизация…</h2>
      <p className="text-sm text-surface-500 text-center">Подождите, настраиваем ваш аккаунт</p>
    </>
  );
}

function OAuthCallbackFallback() {
  return (
    <>
      <div className="workspace-loader mb-2" />
      <h2 className="text-xl font-semibold text-surface-900 workspace-topbar-title">Авторизация…</h2>
      <p className="text-sm text-surface-500 text-center">Подождите, настраиваем ваш аккаунт</p>
    </>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="workspace-loader-wrap">
      <div className="workspace-welcome-card rounded-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-3 relative overflow-hidden">
        <div className="workspace-welcome-card__orb workspace-welcome-card__orb--1" />
        <div className="workspace-welcome-card__orb workspace-welcome-card__orb--2" />
        <div className="auth-logo-icon relative z-10 w-14 h-14 rounded-2xl">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <Suspense fallback={<OAuthCallbackFallback />}>
          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <OAuthCallbackContent />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
