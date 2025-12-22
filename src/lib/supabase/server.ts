import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
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
