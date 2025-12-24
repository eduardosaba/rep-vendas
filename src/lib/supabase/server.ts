import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  // Startup diagnostic: log environment and cookie naming strategy
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieStrategy = isProd ? '__Secure-*' : 'sb-*';
    console.log(
      '[supabase.server] createClient env:',
      JSON.stringify({ NODE_ENV: process.env.NODE_ENV, cookieStrategy })
    );
  } catch (e) {
    console.warn('[supabase.server] failed to log startup diagnostics', e);
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                  // Preserve the original cookie object properties from cookieStore
                  out.push({ ...c, name: base });
                }
              }
            });
            return out;
          } catch (e) {
            console.warn('[supabase.server] getAll normalization failed', e);
            return cookieStore.getAll();
          }
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, any>;
          }>
        ) {
          try {
            // Log cookie names and options (avoid printing raw token values)
            const summary = cookiesToSet.map((c: any) => ({
              name: c.name,
              hasValue: !!c.value,
              options: c.options ?? null,
            }));
            console.log(
              '[supabase.server] setAll called:',
              JSON.stringify(summary)
            );

            cookiesToSet.forEach(({ name, value, options }: any) => {
              try {
                cookieStore.set(name, value, options);
                console.log('[supabase.server] cookieStore.set OK', {
                  name,
                  options,
                });
              } catch (e) {
                console.error('[supabase.server] cookieStore.set FAILED', {
                  name,
                  error: (e as any)?.message ?? e,
                });
                // fallback: try set without options
                try {
                  cookieStore.set(name, value);
                  console.log(
                    '[supabase.server] cookieStore.set OK (fallback no options)',
                    { name }
                  );
                } catch (inner) {
                  console.error(
                    '[supabase.server] cookieStore.set fallback FAILED',
                    { name, error: (inner as any)?.message ?? inner }
                  );
                }
              }
            });
          } catch (error) {
            console.error('[supabase.server] setAll error', error);
            // Server Components lidam com isso via middleware
          }
        },
      },
    }
  );
}
