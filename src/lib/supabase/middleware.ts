import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // 1. Cria a resposta base
  let response = NextResponse.next({
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
        setAll(cookiesToSet) {
          // Sincroniza o request para que o getUser() veja as mudanças nesta execução
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Atualiza a resposta base para incluir os cabeçalhos Set-Cookie
          response = NextResponse.next({
            request,
          });

          // Define os cookies na resposta para o navegador gravar no domínio oficial
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Valida o usuário (Isso dispara o setAll se o token precisar de renovação)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 3. Regra: Logado tentando acessar Login/Register
  if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    if (!profileData?.onboarding_completed) {
      url.pathname = '/onboarding';
    } else if (profileData?.role === 'master') {
      url.pathname = '/admin';
    } else {
      url.pathname = '/dashboard';
    }

    const redirectResponse = NextResponse.redirect(url);
    // COPIA COOKIES: Garante que o token de login chegue ao navegador
    response.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  // 4. Regra: Deslogado tentando acessar área restrita
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/onboarding');
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Importante: Mesmo no redirect para login, passamos a response atual
    // para limpar cookies expirados se houver
    const redirectResponse = NextResponse.redirect(url);
    response.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  return response;
}
