import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Middleware: administra redirecionamentos e bloqueios por status/role
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const COMPANY_CATALOG_RESTRICTED_PREFIXES = [
    '/dashboard/products',
    '/dashboard/categories',
    '/dashboard/brands',
    '/dashboard/marketing',
    '/dashboard/settings/sync',
  ];

  // Ignora ativos do Next e rotas de auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value } as any));
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const withTimeout = async <T,>(p: PromiseLike<T>, ms: number) =>
    Promise.race([p as Promise<T>, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  let user: any = null;
  try {
    const res: any = await withTimeout(supabase.auth.getUser(), 2000);
    user = res?.data?.user || null;
  } catch {
    user = null;
  }

  // Proteção para área admin
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminRoute) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');
    if (user) {
      try {
        const profileRes: any = await withTimeout(
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then((r: any) => r),
          2000
        );
        const profile = profileRes?.data || profileRes;
        const role = profile?.role;
        const isMaster = role === 'master';
        const isAdminCompany = role === 'admin_company';
        const allowCompanyConfig =
          pathname.startsWith('/admin/configuracoes') ||
          pathname.startsWith('/api/admin/catalogo') ||
          pathname.startsWith('/api/admin/company');

        if (!(isMaster || (isAdminCompany && allowCompanyConfig)) && (!secret || header !== secret)) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      } catch {
        if (!secret || header !== secret) return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      if (!secret || header !== secret) return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Bloqueio por status/trial
  try {
    if (user) {
      const profileWithPermRes: any = await withTimeout(
        supabase
          .from('profiles')
          .select('status, trial_ends_at, role, company_id, can_manage_catalog')
          .eq('id', user.id)
          .maybeSingle()
          .then((r: any) => r),
        2000
      );

      const profileWithPerm = profileWithPermRes?.data || profileWithPermRes;

      const isCompanyMember = Boolean((profileWithPerm as any)?.company_id);
      const role = String((profileWithPerm as any)?.role || '');
      const canManageCatalog = Boolean((profileWithPerm as any)?.can_manage_catalog);
      const isCompanyAdminRole =
        role === 'admin_company' ||
        role === 'master' ||
        ((role === 'representative' || role === 'rep') && isCompanyMember);
      const canAccessCompanyCatalogOps = isCompanyAdminRole || canManageCatalog;
      const canManageTeam = isCompanyAdminRole;

      if (pathname.startsWith('/dashboard/equipe') && !canManageTeam) {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }

      if (
        isCompanyMember &&
        !canAccessCompanyCatalogOps &&
        COMPANY_CATALOG_RESTRICTED_PREFIXES.some((p) => pathname.startsWith(p))
      ) {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }

      const profile = profileWithPerm;
      const status = (profile as any)?.status || 'trial';
      const trialEnds = (profile as any)?.trial_ends_at ? new Date((profile as any).trial_ends_at) : null;
      const now = new Date();
      const isTrialExpired = trialEnds ? now > trialEnds : false;

      // Permitir acesso ao dashboard para o dono da loja mesmo se bloqueado;
      // bloqueios aplicam-se principalmente ao frontend público e à finalização de pedidos.
      const publicPrefixes = ['/dashboard', '/dashboard/billing', '/dashboard/billing/expired', '/support', '/api', '/login'];
      const allowed = publicPrefixes.some((p) => pathname.startsWith(p));
      if ((status === 'blocked') || (status === 'trial' && isTrialExpired)) {
        if (!allowed) return NextResponse.redirect(new URL('/dashboard/billing/expired', request.url));
      }
    }
  } catch (e) {
    console.warn('status check failed', e);
  }

  // Redirecionamentos úteis
  if (pathname.startsWith('/dashboard') && !user) return NextResponse.redirect(new URL('/login', request.url));
  if (pathname === '/login' && user) return NextResponse.redirect(new URL('/dashboard', request.url));

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
