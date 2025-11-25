import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 1. Se não estiver logado e tentar acessar área protegida -> Login
  if (
    !session &&
    (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/admin'))
  ) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se estiver logado, verificar Role e Licença
  if (session) {
    // Buscar o perfil do usuário para ver a Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, license_expires_at')
      .eq('id', session.user.id)
      .single();

    // 2. Proteção da Torre de Controle (Master Only)
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (profile?.role !== 'master') {
        // Se não for master, manda pro dashboard normal
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // 3. Verificação de Licença (Para Representantes)
    if (
      req.nextUrl.pathname.startsWith('/dashboard') &&
      !req.nextUrl.pathname.startsWith('/dashboard/subscription') &&
      !req.nextUrl.pathname.startsWith('/onboarding')
    ) {
      const isExpired = new Date(profile?.license_expires_at) < new Date();

      if (
        profile?.role === 'rep' &&
        (profile?.status !== 'active' || isExpired)
      ) {
        // Se a licença venceu, manda para página de renovação/bloqueio
        return NextResponse.redirect(
          new URL('/dashboard/subscription/expired', req.url)
        );
      }

      // 4. Verificar se usuário configurou a loja (settings). Se não, redirecionar para onboarding
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('id, catalog_slug, name')
          .eq('user_id', session.user.id)
          .single();

        const hasSettings = Boolean(
          settings && (settings.catalog_slug || settings.name)
        );

        if (!hasSettings && req.nextUrl.pathname.startsWith('/dashboard')) {
          return NextResponse.redirect(new URL('/onboarding', req.url));
        }
      } catch (e) {
        // Em caso de erro na leitura, apenas seguir em frente (não bloquear acesso)
        console.error('Middleware settings check failed', e);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/onboarding/:path*', // rota de onboarding protegida
  ],
};
