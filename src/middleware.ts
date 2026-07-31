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

  // --- BYPASS COMPLETO PARA CATÁLOGO PÚBLICO ---
  // Não criar cliente Supabase, não validar sessão, não ler cookies de auth
  const isPublicCatalog =
    pathname === '/catalogo' ||
    pathname.startsWith('/catalogo/');

  if (isPublicCatalog) {
    return response;
  }

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

  // --- IGNORA OUTBOX CRON ---
  if (pathname === '/api/cron/outbox') {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (secret && authHeader === `Bearer ${secret}`) {
      return response;
    }
  }

  // --- ROTAS DO WEBHOOK ---
  if (
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/v1/webhooks/')
  ) {
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
      if (pathname.startsWith('/api/admin')) {
        return forbidden();
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return redirectTo(loginUrl);
    }
  }

  // --- PROTEÇÃO BÁSICA DO DASHBOARD ---
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);

    return redirectTo(loginUrl);
  }

  // --- USUÁRIO LOGADO NÃO VOLTA PARA LOGIN ---
  if (pathname === '/login' && user) {
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;

    const requestedRedirect =
      searchParams?.get('redirectTo') ||
      searchParams?.get('redirectedFrom');

    const safeRedirect =
      requestedRedirect?.startsWith('/') &&
      !requestedRedirect.startsWith('//')
        ? requestedRedirect
        : null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        '[middleware] Erro ao consultar perfil:',
        profileError.message
      );
    }

    const isAdmin = isAdminRole(profile?.role);

    if (safeRedirect?.startsWith('/admin')) {
      return redirectTo(isAdmin ? safeRedirect : '/dashboard');
    }

    if (safeRedirect?.startsWith('/dashboard')) {
      return redirectTo(isAdmin ? '/admin' : safeRedirect);
    }

    return redirectTo(isAdmin ? '/admin' : '/dashboard');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
