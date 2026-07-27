import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Record<string, any>;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Ignorar arquivos estáticos, service workers e rotas de sistema
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/firebase-messaging-sw.js' ||
    pathname === '/admin/unauthorized' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  function copySupabaseCookies(targetResponse: NextResponse) {
    response.cookies.getAll().forEach((cookie) => {
      targetResponse.cookies.set(cookie);
    });

    return targetResponse;
  }

  function redirectTo(url: URL | string) {
    const targetUrl = typeof url === 'string' ? new URL(url, request.url) : url;
    return copySupabaseCookies(NextResponse.redirect(targetUrl));
  }

  function forbidden() {
    return copySupabaseCookies(new NextResponse('Forbidden', { status: 403 }));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: 'repvendas-auth-token',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },

    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          });
        });
      },
    },
  });

  let user: any = null;

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const isInvalidRefreshToken =
        authError.message?.includes('Invalid Refresh Token') ||
        authError.message?.includes('Refresh Token Not Found') ||
        (authError as any)?.code === 'refresh_token_not_found';

      if (isInvalidRefreshToken) {
        request.cookies.getAll().forEach((cookie) => {
          if (cookie.name.includes('auth') || cookie.name.startsWith('sb-') || cookie.name === 'repvendas-auth-token') {
            response.cookies.set({
              name: cookie.name,
              value: '',
              path: '/',
              expires: new Date(0),
              maxAge: 0,
            });
          }
        });
      }
    }

    user = authError ? null : authUser || null;
  } catch (error: any) {
    console.warn('[middleware] Falha ao buscar usuário:', error?.message || error);
    if (error instanceof Error) {
      console.warn('[middleware] Name:', error.name);
      console.warn('[middleware] Cause:', (error as any).cause);
      console.warn('[middleware] Stack:', error.stack);
    }
    user = null;
  }

  /*
    Essa rota é chamada pelo DashboardHeader apenas para saber se existe impersonation ativa.
    Se ela ficar dentro da proteção geral de /api/admin, usuários comuns recebem 403 no console.
    A própria rota ainda deve cuidar para não retornar dados sensíveis.
  */
  if (pathname === '/api/admin/impersonate/status') {
    return response;
  }

  // --- PROTEÇÃO ÁREA ADMIN ---
  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (isAdminRoute) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');

    // Permite chamadas internas autorizadas
    if (secret && header === secret) {
      return response;
    }

    if (!user) {
      return forbidden();
    }
    
    // NOTA: As validações de ROLE (master, admin_company) foram movidas 
    // para os layouts e páginas server-side.
  }

  // --- PROTEÇÃO BÁSICA DO DASHBOARD ---
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);

    return redirectTo(loginUrl);
  }

  // --- USUÁRIO LOGADO NÃO VOLTA PARA LOGIN ---
  if (pathname === '/login' && user) {
    return redirectTo('/dashboard');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
