import { NextRequest, NextResponse } from 'next/server';

const LOCAL_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function resolveApiProxyTarget(): string | null {
  const proxy = (process.env.API_PROXY_TARGET || '').replace(/\/$/, '');
  if (proxy && !LOCAL_HOST_RE.test(proxy)) {
    return proxy;
  }
  return null;
}

/**
 * Proxy /api/* to the API gateway at runtime (Render sets API_PROXY_TARGET).
 * Build-time rewrites in next.config.js often miss this env var.
 */
export function middleware(request: NextRequest) {
  const apiTarget = resolveApiProxyTarget();
  if (!apiTarget) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (apiTarget.replace(/\/$/, '') === request.nextUrl.origin) {
    return NextResponse.next();
  }

  const destination = new URL(`${pathname}${search}`, apiTarget);
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: '/api/:path*',
};
