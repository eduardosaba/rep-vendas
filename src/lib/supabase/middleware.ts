import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // 1. Cria a resposta base que permite a continuação da requisição
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
        setAll(cookiesToSet: any[]) {
          // Atualiza o request para que o Next.js veja as mudanças nesta execução
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          );

          // Cria uma nova resposta baseada no request atualizado
          response = NextResponse.next({
            request,
          });

          // Define os cookies na resposta para que o navegador os grave no domínio
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Valida o usuário (dispara o setAll se o token precisar de renovação)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 3. Regra de Redirecionamento: Logado tentando acessar Login/Register
  if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';

    // REDIRECIONAMENTO COM PERSISTÊNCIA:
    // Criamos o redirecionamento e COPIAMOS todos os cookies da resposta anterior
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // 4. Regra de Redirecionamento: Deslogado tentando acessar área restrita
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

  return response;
}
