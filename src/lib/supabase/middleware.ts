import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // 1. Criamos a resposta inicial
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
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, any>;
          }>
        ) {
          try {
            const summary = cookiesToSet.map((c) => ({
              name: c.name,
              hasValue: !!c.value,
              options: c.options ?? null,
            }));
            console.log(
              '[supabase.middleware] setAll called:',
              JSON.stringify(summary)
            );
          } catch (e) {
            console.warn(
              '[supabase.middleware] failed to stringify cookies summary',
              e
            );
          }

          // Atualiza o request para que o getUser() veja as mudanças nesta execução
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Re-instancia a resposta para garantir que os cookies do middleware sejam incluídos
          response = NextResponse.next({
            request,
          });

          // Define os cookies na resposta final
          cookiesToSet.forEach(({ name, value, options }) =>
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

  // 3. Lógica de Redirecionamento Blindada
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/onboarding');
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');

  if (user && isAuthPage) {
    // Busca o perfil para saber onde redirecionar (opcional, mas evita loops internos)
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .maybeSingle();

    let target = '/dashboard';
    if (!profile?.onboarding_completed) target = '/onboarding';
    else if (profile?.role === 'master') target = '/admin';

    const redirectRes = NextResponse.redirect(new URL(target, request.url));
    // COPIA MANUAL DE COOKIES: Essencial para o Next.js 15 persistir a sessão
    response.cookies
      .getAll()
      .forEach((c) => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  if (!user && isProtectedRoute) {
    const redirectRes = NextResponse.redirect(new URL('/login', request.url));
    // Copia cookies mesmo no erro para limpar sessões inválidas
    response.cookies
      .getAll()
      .forEach((c) => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  return response;
}
