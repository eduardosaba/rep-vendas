import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  // 1. Cria uma resposta inicial
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Valida variáveis de ambiente essenciais
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Loga o erro usando o logger centralizado e sinaliza via header
    logger.error(
      'Missing Supabase env vars for middleware: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    supabaseResponse.headers.set('x-supabase-middleware-error', 'missing-env');
    return supabaseResponse;
  }

  // 3. Cria o cliente Supabase para gerenciar cookies nesta requisição
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>
      ) {
        // Atualiza os cookies no request (se suportado) E no response
        const reqCookies = request.cookies as unknown as {
          set?: (name: string, value: string) => void;
        };
        if (typeof reqCookies.set === 'function') {
          cookiesToSet.forEach(({ name, value }) =>
            reqCookies.set!(name, value)
          );
        }

        // Recria a response para garantir que possamos setar cookies
        supabaseResponse = NextResponse.next({ request });

        // Filtra opções conhecidas antes de repassar para NextResponse
        const allowed = [
          'path',
          'domain',
          'expires',
          'httpOnly',
          'secure',
          'sameSite',
          'maxAge',
        ];

        cookiesToSet.forEach(({ name, value, options }) => {
          const safeOptions: Record<string, unknown> = {};
          if (options) {
            const opts = options as Record<string, unknown>;
            for (const k of allowed) {
              if (opts[k] !== undefined) safeOptions[k] = opts[k];
            }
          }

          // se não houver opções, seta sem o terceiro argumento
          if (Object.keys(safeOptions).length === 0) {
            supabaseResponse.cookies.set(name, value);
          } else {
            // Faz um cast seguro para o tipo esperado pelo NextResponse
            // Evita uso de `any` direto para satisfazer o linter
            supabaseResponse.cookies.set(
              name,
              value,
              safeOptions as unknown as Record<string, unknown>
            );
          }
        });
      },
    },
  });

  // 4. Atualiza a sessão (Auth getUser)
  // Isso garante que o token seja renovado se estiver expirado
  let user: unknown | null = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser ?? null;
  } catch (err) {
    // Não quebre a requisição por falha temporária no auth
    // Loga o erro e sinaliza via header para observabilidade
    logger.error('Supabase getUser failed in middleware', err);
    supabaseResponse.headers.set('x-supabase-getuser-error', '1');
    user = null;
  }

  // 4. Proteção de Rota Básica (Opcional aqui, mas recomendado)
  // Se o usuário NÃO estiver logado e tentar acessar /dashboard ou /admin
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se o usuário ESTIVER logado e tentar acessar /login, manda pro dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
