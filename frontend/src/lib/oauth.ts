/**
 * OAuth / API base URL helpers.
 * Uses the current site origin when the app and API share one public host (e.g. Render).
 */

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (!configured || configured === origin) {
      return origin;
    }
    return configured;
  }

  return configured || 'http://localhost:8000';
}

export function getOAuthStartUrl(provider: 'google' | 'github'): string {
  return `${getApiBaseUrl()}/api/auth/${provider}`;
}
