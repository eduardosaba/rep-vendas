import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // 1. Criamos a resposta inicial
  let response = NextResponse.next({
    request,
  });

  try {
    console.log(
      '[supabase.middleware] incoming cookie header:',
      request.headers.get('cookie')
    );
  } catch (e) {
    console.warn('[supabase.middleware] could not read header cookie', e);
  }

  // Log the cookie names as seen by NextRequest cookie store (quick diagnostic)
  try {
    const allCookies = request.cookies.getAll();
    console.log(
      '[supabase.middleware] cookies received:',
      allCookies.map((c) => c.name)
    );
  } catch (e) {
    console.warn(
      '[supabase.middleware] failed to read request.cookies at start',
      e
    );
  }

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

  // Log request.cookie entries as seen by the NextRequest cookie store
  try {
    const reqCookies = request.cookies.getAll();
    const summary = reqCookies.map((c) => ({
      name: c.name,
      valuePresent: !!c.value,
    }));
    console.log(
      '[supabase.middleware] request.cookies.getAll():',
      JSON.stringify(summary)
    );
  } catch (e) {
    console.warn('[supabase.middleware] failed to list request.cookies', e);
  }

  // 2. Valida o usuário (dispara o setAll se o token precisar de renovação)
  const sessionRes = await supabase.auth.getSession();
  try {
    console.log(
      '[supabase.middleware] getSession raw',
      JSON.stringify({
        data: sessionRes?.data ?? null,
        error: sessionRes?.error ?? null,
      })
    );
  } catch (e) {
    console.warn('[supabase.middleware] getSession failed to stringify', e);
    console.log('[supabase.middleware] getSession raw fallback', sessionRes);
  }

  const userRes = await supabase.auth.getUser();
  try {
    console.log(
      '[supabase.middleware] getUser raw',
      JSON.stringify({
        data: userRes?.data ?? null,
        error: userRes?.error ?? null,
      })
    );
  } catch (e) {
    console.warn('[supabase.middleware] getUser failed to stringify', e);
    console.log('[supabase.middleware] getUser raw fallback', userRes);
  }
  let user = userRes?.data?.user ?? null;

  // Fallback: se supabase não retornou usuário, tente decodificar o JWT do cookie sb-access-token
  if (!user) {
    try {
      const reqCookies = request.cookies.getAll();
      const access = reqCookies.find((c) => c.name === 'sb-access-token');
      if (access && access.value) {
        const parts = access.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf8')
          );
          const now = Math.floor(Date.now() / 1000);
          if (typeof payload.exp === 'number' && payload.exp > now) {
            user = { id: payload.sub, email: payload.email } as any;
            console.log(
              '[supabase.middleware] fallback: decoded JWT, userId:',
              payload.sub
            );
          } else {
            console.log(
              '[supabase.middleware] fallback: token expired or invalid exp'
            );
          }
        }
      }
    } catch (e) {
      console.warn('[supabase.middleware] fallback JWT decode failed', e);
    }
  }
  // NOTE: development fallback (previously set a dev-only cookie/header)
  // has been removed for production safety. Keep the JWT decode fallback above
  // which logs the userId when possible, but do not set any persistent dev cookies.
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

    // Temporariamente desativar redirecionamento para /onboarding
    let target = '/dashboard';
    if (profile?.role === 'master') target = '/admin';

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
