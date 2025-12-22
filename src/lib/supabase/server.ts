import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkSupabaseEnv } from '../env';

export async function createClient() {
  // 1. Valida as variáveis de ambiente usando seu utilitário existente
  const { url, anon } = checkSupabaseEnv();

  // 2. No Next.js 15, cookies() é uma Promise e DEVE ter await
  const cookieStore = await cookies();

  return createServerClient(url!, anon!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (error) {
          // Server Components não podem setar cookies.
          // O Middleware (updateSession) gerenciará a renovação se necessário.
        }
      },
    },
  });
}

// Aliases para compatibilidade
export const createServerSupabase = createClient;
export const createRouteSupabase = createClient;
