import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware de proteção de rotas sensíveis.
// Uso: defina a variável de ambiente INTERNAL_MIDDLEWARE_SECRET com um valor seguro
// e inclua o header `x-internal-secret` nas requisições internas (deploy hooks, healthchecks).

// Protegemos APENAS endpoints administrativos — não todo o `/api/*`,
// para evitar bloquear chamadas públicas do client (fetch, getStaticProps, etc.).
const ADMIN_API_PREFIX = '/api/admin';
const ADMIN_UI_PREFIX = '/admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se for endpoint administrativo, exigir segredo
  if (
    pathname.startsWith(ADMIN_API_PREFIX) ||
    pathname.startsWith(ADMIN_UI_PREFIX)
  ) {
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
  // Apenas casar rotas de admin — deixa /api/* públicas como eram antes
  matcher: ['/api/admin/:path*', '/admin/:path*'],
};
