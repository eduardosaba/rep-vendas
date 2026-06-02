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

  const withTimeout = async <T>(promise: PromiseLike<T>, ms: number) =>
    Promise.race([
      promise as Promise<T>,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);

  let user: any = null;

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await withTimeout(supabase.auth.getUser(), 5000);

    user = authError ? null : authUser || null;
  } catch (error) {
    console.warn('[middleware] Falha ao buscar usuário:', error);
    user = null;
  }

  const COMPANY_CATALOG_RESTRICTED_PREFIXES = [
    '/dashboard/products',
    '/dashboard/categories',
    '/dashboard/brands',
    '/dashboard/marketing',
    '/dashboard/settings/sync',
  ];

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

    try {
      const profileRes: any = await withTimeout(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle(),
        5000
      );

      const profile = profileRes?.data || null;
      const role = profile?.role;

      const isMaster = role === 'master';
      const isAdminCompany = role === 'admin_company';

      const allowCompanyConfig =
        pathname.startsWith('/admin/configuracoes') ||
        pathname.startsWith('/api/admin/catalogo');

      if (!(isMaster || (isAdminCompany && allowCompanyConfig))) {
        return forbidden();
      }
    } catch (error) {
      console.warn('[middleware] Falha na proteção admin:', error);
      return forbidden();
    }
  }

  // --- BLOQUEIO POR STATUS/TRIAL + PERMISSÕES DE CATÁLOGO ---
  if (user) {
    try {
      const profileRes: any = await withTimeout(
        supabase
          .from('profiles')
          .select('status, trial_ends_at, role, company_id, can_manage_catalog')
          .eq('id', user.id)
          .maybeSingle(),
        5000
      );

      const profile = profileRes?.data || null;

      if (profile) {
        const isCompanyMember = Boolean(profile.company_id);
        const role = String(profile.role || '');
        const canManageCatalog = Boolean(profile.can_manage_catalog);

        const isCompanyAdminRole =
          role === 'admin_company' ||
          role === 'master' ||
          ((role === 'representative' || role === 'rep') && isCompanyMember);

        const isCatalogRestrictedRoute =
          COMPANY_CATALOG_RESTRICTED_PREFIXES.some((prefix) =>
            pathname.startsWith(prefix)
          );

        if (
          isCompanyMember &&
          !isCompanyAdminRole &&
          !canManageCatalog &&
          isCatalogRestrictedRoute
        ) {
          return redirectTo('/admin/unauthorized');
        }

        const status = profile.status || 'trial';

        const trialEnds = profile.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : null;

        const isTrialExpired = trialEnds ? new Date() > trialEnds : false;

        const publicPrefixes = [
          '/dashboard/fatura',
          '/dashboard/subscription/expired',
          '/support',
          '/api',
          '/login',
          '/catalogo',
        ];

        const isAllowedRoute = publicPrefixes.some((prefix) =>
          pathname.startsWith(prefix)
        );

        if (
          (status === 'blocked' || (status === 'trial' && isTrialExpired)) &&
          pathname.startsWith('/dashboard') &&
          !isAllowedRoute
        ) {
          return redirectTo('/dashboard/subscription/expired');
        }
      }
    } catch (error) {
      console.warn('[middleware] Status check failed:', error);
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
    return redirectTo('/dashboard');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
