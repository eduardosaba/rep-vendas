import { createServerClient } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';

export function createClient() {
  const cookieStore: any = (nextCookies as any)();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll ? cookieStore.getAll() : [];
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options?: any;
              }) => {
                if (typeof cookieStore.set === 'function')
                  cookieStore.set(name, value, options);
              }
            );
          } catch {
            // Server Components não permitem set direto em alguns contextos
          }
        },
      },
    }
  );
}

// Compat shim para rotas API que passam uma função que retorna o store
export async function createRouteSupabase(getCookies?: () => any) {
  const cookieStore = getCookies ? await getCookies() : nextCookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // next/headers CookieStore has getAll()
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Some runtimes provide a Response-like cookies API
              if (typeof cookieStore.set === 'function')
                cookieStore.set(name, value, options);
            });
          } catch {
            // ignore
          }
        },
      },
    }
  );
}

// Default export for compatibility with modules importing default
export default createClient;
