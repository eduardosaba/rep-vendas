import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Cria o cliente Supabase para o contexto do middleware
  const supabase = createMiddlewareClient({ req, res });

  // Verifica a sessão atual
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rota atual que o usuário está tentando acessar
  const path = req.nextUrl.pathname;

  // 1. PROTEÇÃO BÁSICA DE LOGIN
  // Se não estiver logado e tentar acessar rotas protegidas -> Redireciona para Login
  // Adicionamos '/onboarding' aqui para garantir que só usuários logados configurem a loja
  if (
    !session &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. SE ESTIVER LOGADO, VERIFICA CARGO E LICENÇA
  if (session) {
    // Buscar o perfil do usuário no banco para ver o Cargo (Role) e Status
    // Nota: Middleware deve ser rápido, então fazemos uma query leve
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, license_expires_at')
      .eq('id', session.user.id)
      .single();

    // 2.1. PROTEÇÃO DA TORRE DE CONTROLE (MASTER)
    // Apenas usuários com role 'master' podem entrar em /admin
    if (path.startsWith('/admin')) {
      if (profile?.role !== 'master') {
        // Se for um representante tentando entrar no admin, chuta para o dashboard dele
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // 2.2. VERIFICAÇÃO DE LICENÇA (PARA REPRESENTANTES)
    // Se for um representante tentando usar o dashboard...
    // (Exceto a página de 'expired' para evitar loop infinito de redirecionamento)
    if (
      path.startsWith('/dashboard') &&
      !path.startsWith('/dashboard/subscription')
    ) {
      // Ignora a verificação se for o Master (o Master nunca expira)
      if (profile?.role === 'rep') {
        const isExpired = profile?.license_expires_at
          ? new Date(profile.license_expires_at) < new Date()
          : true; // Se não tiver data, considera expirado (segurança)

        const isInactive = profile?.status !== 'active';

        if (isInactive || isExpired) {
          // Se a conta não está ativa ou venceu -> Redireciona para página de bloqueio
          return NextResponse.redirect(
            new URL('/dashboard/subscription/expired', req.url)
          );
        }
      }
    }
  }

  return res;
}

// Configuração: Em quais rotas este middleware deve rodar?
export const config = {
  matcher: [
    // Protege todas as rotas de dashboard, admin e onboarding
    '/dashboard/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
  ],
};
