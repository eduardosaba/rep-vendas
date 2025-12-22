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
  // Permitimos que a rota de onboarding seja acessada inicialmente sem sessão
  // para evitar loops: o cliente fará a revalidação da sessão e redirecionará
  // se necessário depois.
  if (path.startsWith('/onboarding')) {
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
