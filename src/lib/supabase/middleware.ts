import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 🛑 FIX: Libera acesso total ao catálogo sem verificar sessão.
  // Isso impede que o navegador fique preso em loop de redirecionamento.
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
        // CORREÇÃO AQUI: Adicionado a tipagem ': any[]' para satisfazer o TypeScript
        setAll(cookiesToSet: any[]) {
          // A mágica acontece aqui:
          // Atualiza os cookies no request E no response para garantir que a sessão persista
          cookiesToSet.forEach(({ name, value }) =>
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

  // 3. Atualiza a sessão e verifica o usuário
  // IMPORTANTE: getUser é mais seguro que getSession para middleware
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Regras de Redirecionamento

  // A. Rotas Protegidas -> Manda para Login se não tiver usuário
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

  // B. Rotas de Auth -> Manda para Dashboard se usuário já estiver logado
  if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Retorna a resposta final com os cookies atualizados
  return supabaseResponse;
}
