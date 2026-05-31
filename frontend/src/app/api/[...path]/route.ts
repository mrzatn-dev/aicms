import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getProxyTarget(): string {
  const raw = (
    process.env.API_PROXY_TARGET ||
    'http://localhost:8000'
  ).replace(/\/$/, '');

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  // Render fromService hostport, e.g. "aicms-9kw6:10000"
  return `http://${raw}`;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const target = getProxyTarget();
  const pathname = `/api/${path.join('/')}`;
  const url = `${target}${pathname}${request.nextUrl.search}`;
  const isStream = pathname.endsWith('/chat/stream');

  const headers = new Headers(request.headers);
  const publicHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host;
  const publicProto =
    request.headers.get('x-forwarded-proto') ||
    request.nextUrl.protocol.replace(':', '') ||
    'https';
  headers.set('x-forwarded-host', publicHost);
  headers.set('x-forwarded-proto', publicProto);
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

  try {
    const upstream = await fetch(url, init);

    if (isStream && upstream.body) {
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete('connection');
      return new NextResponse(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    }

    const body = await upstream.arrayBuffer();

    const responseHeaders = new Headers(upstream.headers);
    // Hop-by-hop / encoding headers must not be forwarded with a buffered body.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy failed:', url, error);
    return NextResponse.json(
      { detail: `API gateway unreachable at ${target}` },
      { status: 502 },
    );
  }
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
