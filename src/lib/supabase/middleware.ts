import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Liberação imediata para catálogo (performance e evitar loops)
  if (path.startsWith('/catalogo')) {
    return NextResponse.next({ request });
  }

  // 2. Resposta base
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          // Sincroniza cookies no Request para que o Next.js veja a mudança nesta requisição
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Gera uma nova resposta para incluir os novos headers de cookie
          supabaseResponse = NextResponse.next({
            request,
          });

          // Sincroniza cookies na Resposta para o navegador salvar
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Obtém o usuário (getUser é essencial para validar o JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Regras de Redirecionamento Protegidas
  // Se for a rota de onboarding, garantimos que apenas usuários que
  // precisam completar o onboarding a vejam. Usuários não autenticados
  // recebem a página (o componente fará redirect para /login). Usuários
  // autenticados que já completaram serão enviados ao dashboard.
  if (path.startsWith('/onboarding')) {
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && profile.onboarding_completed) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      } catch (e) {
        // Em caso de erro ao buscar profile, permitimos renderizar a página
        // para que o fluxo cliente possa tentar revalidar e reportar.
        // Não bloqueamos por segurança.
      }
    }

    return supabaseResponse;
  }

  const isProtectedRoute =
    path.startsWith('/dashboard') || path.startsWith('/admin');

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 5. Redireciona usuários logados para fora das páginas de Auth
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register');
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
