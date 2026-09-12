import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isGlobalAdmin } from '@/lib/auth/roles';

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

  // 1. ISENÇÃO TOTAL DE CONSULTA DE PROFILES PARA CATÁLOGO PÚBLICO, HOME, PROXY DE IMAGENS E ASSETS ESTATÍSTICOS
  const isHomePage = pathname === '/';
  const isPublicStorageImage = pathname === '/api/storage-image';
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

  // 2. ISENÇÃO CONDICIONAL DE /LOGIN SE NÃO HOUVER COOKIE DE AUTENTICAÇÃO
  const isLoginRoute = pathname === '/login';
  const hasAuthCookie = request.cookies.getAll().some((c) => {
    const name = c.name.toLowerCase();
    return (
      name.startsWith('sb-') ||
      name.includes('repvendas-auth-token') ||
      name.includes('auth-token') ||
      name.includes('access-token')
    );
  });

  const isAnonymousLoginRequest = isLoginRoute && !hasAuthCookie;

  if (
    isHomePage ||
    isPublicStorageImage ||
    isPublicCatalog ||
    isPublicAuthRoute ||
    isAssetOrSystem ||
    isAnonymousLoginRequest
  ) {
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err: any) {
    console.warn('[middleware] Instabilidade temporária ao consultar usuário:', err?.message || err);
  }

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

  // --- VERIFICAÇÃO DE IS_ACTIVE E ONBOARDING NAS ROTAS PROTEGEDAS E /LOGIN ---
  if (user && (isAdminRoute || isDashboardRoute || isPrivateApiRoute || pathname === '/login')) {
    let profile = null;
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[middleware] Aviso ao consultar perfil:', profileError.message);
      } else {
        profile = data;
      }
    } catch (err: any) {
      console.warn('[middleware] Instabilidade temporária ao consultar tabela de perfis:', err?.message || err);
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

    // --- BLOQUEIO DE ACESSO AO DASHBOARD QUANDO ONBOARDING ESTÁ PENDENTE ---
    if (isDashboardRoute && profile && profile.onboarding_completed === false) {
      return redirectTo('/onboarding');
    }

    const userRole = String(profile?.role || '').toLowerCase();
    const isControlTowerUser = isGlobalAdmin(userRole);

    // Se um usuário não-master tentar acessar a Torre de Controle (/admin), redireciona para o /dashboard
    if (isAdminRoute && !isControlTowerUser) {
      if (pathname.startsWith('/api/admin')) {
        return forbidden();
      }
      return redirectTo('/dashboard');
    }

    // Se o usuário está ativo e acessando /login, redireciona para a home da sua role
    if (pathname === '/login') {
      const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
      const requestedRedirect = searchParams?.get('redirectTo') || searchParams?.get('redirectedFrom');
      const safeRedirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : null;

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
