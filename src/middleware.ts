import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Startup diagnostic: log environment and cookie naming strategy for middleware
try {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieStrategy = isProd ? '__Secure-*' : 'sb-*';
  console.log(
    '[middleware] startup env:',
    JSON.stringify({ NODE_ENV: process.env.NODE_ENV, cookieStrategy })
  );
} catch (e) {
  console.warn('[middleware] failed to log startup diagnostics', e);
}

export async function middleware(request: NextRequest) {
  // Intercept /icon.ico and redirect permanently to /favicon.ico
  try {
    if (request.nextUrl.pathname === '/icon.ico') {
      return new Response(null, {
        status: 301,
        headers: { Location: '/favicon.ico' },
      });
    }
  } catch (e) {
    // ignore
  }

  // Apenas delegamos para o updateSession.
  // Ele já contém a lógica de liberação de catálogo e proteção de rotas.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas, exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico e ícones
     * - imagens públicas (svg, png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
