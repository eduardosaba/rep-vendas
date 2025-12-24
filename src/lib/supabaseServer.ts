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
          // Normaliza nomes: se o cookie estiver gravado com prefixo __Secure-
          // expomos também o nome sem prefixo (ex: __Secure-sb-access-token -> sb-access-token)
          try {
            const raw = cookieStore.getAll();
            const out = [...raw];
            raw.forEach((c: any) => {
              if (
                typeof c.name === 'string' &&
                c.name.startsWith('__Secure-')
              ) {
                const base = c.name.replace(/^__Secure-/, '');
                const exists =
                  raw.some((r: any) => r.name === base) ||
                  out.some((r: any) => r.name === base);
                if (!exists) {
                  out.push({ ...c, name: base });
                }
              }
            });
            return out;
          } catch (e) {
            console.warn('[supabaseServer] getAll normalization failed', e);
            return cookieStore.getAll();
          }
        },
        // CORREÇÃO AQUI: Adicionado ': any[]'
        setAll(cookiesToSet: any[]) {
          try {
            try {
              const summary = cookiesToSet.map((c: any) => ({
                name: c.name,
                hasValue: !!c.value,
                options: c.options ?? null,
              }));
              console.log(
                '[supabase.server.route] setAll called:',
                JSON.stringify(summary)
              );
            } catch (e) {
              console.warn(
                '[supabase.server.route] failed to stringify cookies summary',
                e
              );
            }

            cookiesToSet.forEach((c: any) =>
              cookieStore.set(c.name, c.value, c.options)
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
export function createRouteSupabase(
  cookieStoreFactory: () => any | Promise<any>
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const store = cookieStoreFactory();
          if (store && typeof (store as any).then === 'function') {
            return [] as any;
          }
          // Normaliza nomes: __Secure-* -> sb-*
          try {
            const raw = (store as any).getAll();
            const out = [...raw];
            raw.forEach((c: any) => {
              if (
                typeof c.name === 'string' &&
                c.name.startsWith('__Secure-')
              ) {
                const base = c.name.replace(/^__Secure-/, '');
                const exists =
                  raw.some((r: any) => r.name === base) ||
                  out.some((r: any) => r.name === base);
                if (!exists) {
                  out.push({ ...c, name: base });
                }
              }
            });
            return out;
          } catch (e) {
            return (store as any).getAll();
          }
        },
        // CORREÇÃO AQUI TAMBÉM: Adicionado ': any[]'
        setAll(cookiesToSet: any[]) {
          try {
            const store = cookieStoreFactory();
            if (store && typeof (store as any).then === 'function') return;
            (store as any).getAll &&
              cookiesToSet.forEach((c: any) =>
                (store as any).set(c.name, c.value, c.options)
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
