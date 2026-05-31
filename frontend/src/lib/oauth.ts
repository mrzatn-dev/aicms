/**
 * OAuth / API base URL helpers.
 * Browser requests use the frontend origin; Next.js rewrites /api/* to the gateway.
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const configured = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  return configured || 'http://localhost:3000';
}

export function getOAuthStartUrl(provider: 'google' = 'google'): string {
  return `${getApiBaseUrl()}/api/auth/${provider}`;
}
