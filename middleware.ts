import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware de proteção de rotas sensíveis.
// Uso: defina a variável de ambiente INTERNAL_MIDDLEWARE_SECRET com um valor seguro
// e inclua o header `x-internal-secret` nas requisições internas (deploy hooks, healthchecks).

const SENSITIVE_PATHS = [
  '/api/admin',
  '/api/admin/',
  '/admin',
  '/.env',
  '/.env.local',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bloqueia acesso direto a caminhos sensíveis
  if (SENSITIVE_PATHS.some((p) => pathname.startsWith(p))) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');
    if (!secret || header !== secret) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Força HTTPS (quando estiver por trás de proxy que suporta NEXT_URL)
  const url = request.nextUrl.clone();
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/catalogo/:path*',
    '/catalog/:path*',
  ],
};
