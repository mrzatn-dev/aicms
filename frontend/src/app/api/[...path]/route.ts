import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getProxyTarget(): string {
  return (
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  ).replace(/\/$/, '');
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const target = getProxyTarget();
  const pathname = `/api/${path.join('/')}`;
  const url = `${target}${pathname}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(url, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: { path: string[] } };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context.params.path);
}
