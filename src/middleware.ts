import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. FILTRO CRÍTICO: Ignora TUDO que não seja uma rota de página
  // Isso impede os erros 404 de scripts (.js) e estilos (.css)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/auth') || // Ignora rotas de auth do supabase
    pathname.includes('.') || 
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. SUPABASE CLIENT
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase SSR expects cookie helpers: get(name), set(name, value, options), delete(name)
        get: (name: string) => {
          const c = request.cookies.get(name);
          return c ? c.value : undefined;
        },
        set: (name: string, value: string, options?: any) => {
          try {
            response.cookies.set(name, value, options);
          } catch (e) {
            // ignore
          }
        },
        delete: (name: string) => {
          try {
            response.cookies.delete(name);
          } catch (e) {
            // ignore
          }
        },
        // fallback: provide all cookies if needed
        getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value } as any)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 3. PROTEÇÃO ADMIN (Ajustada)
  // Só bloqueia se for explicitamente a área de gerenciamento interno
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminRoute) {
    const secret = process.env.INTERNAL_MIDDLEWARE_SECRET;
    const header = request.headers.get('x-internal-secret');

    // Se for uma requisição do navegador (GET) para o painel admin, e não houver
    // o segredo no header, bloqueamos. APIs internas também exigem o segredo.
    // If there's an authenticated user, allow if they are `master`.
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile && profile.role === 'master') {
          // allow
        } else if (!secret || header !== secret) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      } catch (e) {
        // If profile lookup fails, fall back to header secret check
        if (!secret || header !== secret) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    } else {
      if (!secret || header !== secret) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  }

  // 4. LÓGICA DE ACESSO AO DASHBOARD
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Matcher simplificado: a lógica interna do middleware cuida do resto
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};