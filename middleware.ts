import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Obter sessão atual
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rotas que requerem autenticação
  const protectedRoutes = [
    '/catalog/[userId]/checkout',
    '/dashboard',
    '/api/orders',
    '/api/notifications',
    '/api/send-email',
  ];

  // Verificar se a rota atual está protegida
  const isProtectedRoute = protectedRoutes.some((route) => {
    const pattern = new RegExp(route.replace('[userId]', '[^/]+'));
    return pattern.test(req.nextUrl.pathname);
  });

  if (isProtectedRoute) {
    if (!session) {
      // Redirecionar para login se não estiver autenticado
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Verificar se o token ainda é válido (não expirou)
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= session.expires_at) {
        // Token expirado, redirecionar para login
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Adicionar headers de segurança
    response.headers.set('X-User-ID', session.user.id);
    response.headers.set('X-Session-ID', session.access_token.slice(-10)); // Apenas últimos 10 chars por segurança
  }

  // Rotas específicas do checkout que precisam de validação extra
  if (req.nextUrl.pathname.includes('/checkout')) {
    // Verificar se há dados de carrinho
    const cartCookie = req.cookies.get('cart');
    if (
      !cartCookie?.value ||
      cartCookie.value === '{}' ||
      cartCookie.value === 'null'
    ) {
      // Redirecionar para catálogo se não há itens no carrinho
      const userId = req.nextUrl.pathname.split('/')[2]; // Extrair userId da URL
      if (userId) {
        const redirectUrl = new URL(`/catalog/${userId}`, req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Adicionar headers específicos do checkout
    response.headers.set('X-Checkout-Session', 'active');
    response.headers.set('X-Checkout-Timestamp', Date.now().toString());
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
