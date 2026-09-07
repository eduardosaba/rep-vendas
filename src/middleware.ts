import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/auth/roles';

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Record<string, any>;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. ISENÇÃO TOTAL DE CONSULTA DE PROFILES PARA CATÁLOGO PÚBLICO E ASSETS ESTATÍSTICOS
  const isPublicCatalog = pathname === '/catalogo' || pathname.startsWith('/catalogo/');
  const isPublicAuthRoute =
    pathname === '/recuperar-senha' ||
    pathname === '/esqueci-senha' ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/auth');
  const isAssetOrSystem =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/firebase-messaging-sw.js' ||
    pathname === '/admin/unauthorized' ||
    pathname.includes('.');

  if (isPublicCatalog || isPublicAuthRoute || isAssetOrSystem) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- IGNORA OUTBOX CRON E WEBHOOKS ---
  if (pathname === '/api/cron/outbox') {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (secret && authHeader === `Bearer ${secret}`) {
      return response;
    }
  }

  if (
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/v1/webhooks/')
  ) {
    return response;
  }

  // --- PROTEÇÃO DE ROTAS PRIVADAS (ADMIN E DASHBOARD) ---
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard');
  const isPrivateApiRoute = pathname.startsWith('/api/') && !pathname.startsWith('/api/public/');

  if (isAdminRoute) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');

    if (secret && header === secret) {
      return response;
    }

    if (!user) {
      if (pathname.startsWith('/api/admin')) {
        return forbidden();
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return redirectTo(loginUrl);
    }
  }

  if (isDashboardRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return redirectTo(loginUrl);
  }

  // --- VERIFICAÇÃO DE IS_ACTIVE NAS ROTAS PROTEGEDAS E /LOGIN ---
  if (user && (isAdminRoute || isDashboardRoute || isPrivateApiRoute || pathname === '/login')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[middleware] Erro ao consultar perfil:', profileError.message);
    }

    if (profile && profile.is_active === false) {
      if (pathname.startsWith('/api')) {
        return forbidden();
      }
      if (pathname !== '/login') {
        const disabledUrl = new URL('/login', request.url);
        disabledUrl.searchParams.set('error', 'account_disabled');
        return redirectTo(disabledUrl);
      }
      // Se já está na página de login, permite a exibição do alerta sem loop
      return response;
    }

    // Se o usuário está ativo e acessando /login, redireciona para a home da sua role
    if (pathname === '/login') {
      const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
      const requestedRedirect = searchParams?.get('redirectTo') || searchParams?.get('redirectedFrom');
      const safeRedirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : null;

      const userRole = String(profile?.role || '').toLowerCase();
      const isControlTowerUser = isAdminRole(userRole);

      if (safeRedirect?.startsWith('/admin')) {
        return redirectTo(isControlTowerUser ? safeRedirect : '/dashboard');
      }

      if (safeRedirect?.startsWith('/dashboard')) {
        return redirectTo(isControlTowerUser ? '/admin' : safeRedirect);
      }

      return redirectTo(isControlTowerUser ? '/admin' : '/dashboard');
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
