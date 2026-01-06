import { NextResponse, type NextRequest } from 'next/server';

// Nota: Esta middleware foi simplificada para rodar no Edge Runtime
// evitando importar `@supabase/ssr` / `@supabase/supabase-js` que
// dependem de APIs Node (process.version) e quebram o build.
// Em vez de consultar o Supabase aqui, fazemos uma verificação leve
// baseada em cookies para determinar se o usuário parece logado.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Tentativa heurística de detectar sessão Supabase por cookie.
  // Suporta alguns nomes comuns usados pelo Supabase e variações.
  const tokenCandidates = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'sb:token',
    'supabase-session',
  ];

  const hasToken = tokenCandidates.some((name) => {
    try {
      const c = request.cookies.get(name);
      return !!(c && (c.value || c));
    } catch {
      return false;
    }
  });

  const path = request.nextUrl.pathname;

  // Rotas que exigem login
  if (
    !hasToken &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/onboarding'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Rotas de visitante que não devem ser acessadas por usuários logados
  if (hasToken && (path.startsWith('/login') || path.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
