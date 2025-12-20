import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Garantia extra: permitir acesso público ao catálogo sem alterar/redirecionar
  const path = request.nextUrl.pathname;
  if (path.startsWith('/catalogo')) {
    return NextResponse.next({ request });
  }

  // 1. Cria uma resposta inicial que permite continuar a requisição
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Cria o cliente Supabase para gerenciar cookies nesta requisição
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // A mágica acontece aqui:
          // Atualiza os cookies no request E no response para garantir que a sessão persista
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Atualiza a sessão (Auth getUser)
  // IMPORTANTE: Não use getSession() em middleware, use getUser() para segurança.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Proteção de Rotas

  // A. Rotas Protegidas (Exigem Login)
  // Se o usuário NÃO estiver logado e tentar acessar dashboard, admin ou onboarding -> Login
  if (
    !user &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/onboarding'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // B. Rotas de Visitante (Bloqueadas para quem já logou)
  // Se o usuário JÁ estiver logado e tentar ir para login ou register -> Dashboard
  if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Retorna a resposta com os cookies atualizados
  return supabaseResponse;
}
