'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      api.setToken(token);

      // Fetch user profile and save
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => {
          localStorage.setItem('user', JSON.stringify(user));
          router.push('/workspace');
        })
        .catch(() => {
          router.push('/workspace');
        });
    } else {
      setError('OAuth авторизация не удалась');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="auth-split-root" style={{ justifyContent: 'center' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1.5rem',
        padding: '2rem',
      }}>
        <div className="auth-logo-icon" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem' }}>
          <Sparkles className="w-7 h-7 text-white" />
        </div>

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
      </div>
    </div>
  );
}
