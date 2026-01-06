import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkSupabaseEnv } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  const { url, anon } = checkSupabaseEnv();

  return createServerClient(
    // pass through even if null/undefined so the underlying lib can surface
    // clearer network errors; we prefer to warn earlier above.
    String(url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    String(anon ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, any>;
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // O método setAll pode falhar em alguns contextos (ex: Server Component).
          }
        },
      },
    }
  );
}

// Compatibilidade: criar um client para Route Handlers onde passamos uma
// factory síncrona que retorna o cookie store (ex: () => nextCookies).
export function createRouteSupabase(cookieStoreFactory: () => any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const store = cookieStoreFactory();
          if (store && typeof store.then === 'function') {
            throw new Error(
              'cookieStoreFactory returned a Promise — pass a sync function that returns the cookie store'
            );
          }
          return store.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, any>;
          }>
        ) {
          try {
            const store = cookieStoreFactory();
            if (store && typeof store.then === 'function') return;
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // ignorar se não for possível setar aqui
          }
        },
      },
    }
  );
}

// Alias por compatibilidade com código anterior
export const createServerSupabase = createClient;

export default createClient;
