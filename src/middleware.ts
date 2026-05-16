import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const COMPANY_CATALOG_RESTRICTED_PREFIXES = [
    '/dashboard/products',
    '/dashboard/categories',
    '/dashboard/brands',
    '/dashboard/marketing',
    '/dashboard/settings/sync',
  ];

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (pathname === '/admin/unauthorized') {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value } as any));
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          } catch { }
        },
      },
    }
  );

  const withTimeout = async <T,>(p: PromiseLike<T>, ms: number) =>
    Promise.race([p as Promise<T>, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  let user: any = null;

  try {
    const { data, error: authError } = await withTimeout(supabase.auth.getUser(), 5000);
    user = authError ? null : data?.user || null;
  } catch (err) {
    user = null;
  }

  // --- PROTEÇÃO ÁREA ADMIN ---
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminRoute) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');
    if (user) {
      try {
        const profileRes: any = await withTimeout(
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          5000
        );
        // Ajuste aqui para extrair o dado corretamente
        const profile = profileRes?.data || null;
        const role = profile?.role;
        const isMaster = role === 'master';
        const isAdminCompany = role === 'admin_company';
        const allowCompanyConfig = pathname.startsWith('/admin/configuracoes') || pathname.startsWith('/api/admin/catalogo');

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

  // --- BLOQUEIO POR STATUS/TRIAL ---
  try {
    if (user) {
      const profileWithPermRes: any = await withTimeout(
        supabase
          .from('profiles')
          .select('status, trial_ends_at, role, company_id, can_manage_catalog')
          .eq('id', user.id)
          .maybeSingle(),
        5000
      );

      // CORREÇÃO AQUI: Definindo a variável 'profile' que estava faltando
      const profile = profileWithPermRes?.data || null;

      if (profile) {
        const isCompanyMember = Boolean((profile as any).company_id);
        const role = String((profile as any).role || '');
        const canManageCatalog = Boolean((profile as any).can_manage_catalog);
        const isCompanyAdminRole = role === 'admin_company' || role === 'master' || ((role === 'representative' || role === 'rep') && isCompanyMember);

        if (isCompanyMember && !isCompanyAdminRole && !canManageCatalog && COMPANY_CATALOG_RESTRICTED_PREFIXES.some(p => pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
        }

        const status = (profile as any).status || 'trial';
        const trialEnds = (profile as any).trial_ends_at ? new Date((profile as any).trial_ends_at) : null;
        const isTrialExpired = trialEnds ? new Date() > trialEnds : false;

        const publicPrefixes = ['/dashboard/fatura', '/dashboard/subscription/expired', '/support', '/api', '/login', '/catalogo'];
        const isAllowedRoute = publicPrefixes.some((p) => pathname.startsWith(p));

        if ((status === 'blocked' || (status === 'trial' && isTrialExpired)) && pathname.startsWith('/dashboard') && !isAllowedRoute) {
          return NextResponse.redirect(new URL('/dashboard/subscription/expired', request.url));
        }
      }
    }
  } catch (e) {
    console.warn('status check failed', e);
  }

  if (pathname.startsWith('/dashboard') && !user) return NextResponse.redirect(new URL('/login', request.url));
  if (pathname === '/login' && user) return NextResponse.redirect(new URL('/dashboard', request.url));

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};