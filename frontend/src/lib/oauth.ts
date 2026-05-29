/**
 * OAuth / API base URL helpers.
 * On a public site (Render), always use the current browser origin so mobile
 * never opens localhost baked in at build time.
 */

const LOCAL_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

export function isLocalHostUrl(url: string): boolean {
  return LOCAL_HOST_RE.test(url);
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // Production (phone/desktop): API is same host, proxied via Next middleware
    if (!isLocalHostUrl(origin)) {
      return origin;
    }

    const configured = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    return configured && !isLocalHostUrl(configured)
      ? configured
      : 'http://localhost:8000';
  }

  const configured = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  return configured || 'http://localhost:8000';
}

export function getOAuthStartUrl(provider: 'google'): string {
  if (typeof window !== 'undefined' && !isLocalHostUrl(window.location.origin)) {
    return `${window.location.origin}/api/auth/${provider}`;
  }
  return `${getApiBaseUrl()}/api/auth/${provider}`;
}
