import { createServerClient } from '@supabase/ssr';

async function getNextCookieStore() {
  try {
    const mod = await import('next/headers');
    if (mod && typeof mod.cookies === 'function') {
      // cookies() may be async in some Next versions
      return await (mod.cookies as any)();
    }
  } catch (e) {
    // not available in this runtime (e.g., pages dir or non-server environment)
  }
  return null;
}

export async function createClient() {
  const cookieStore: any = await getNextCookieStore();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore && typeof cookieStore.getAll === 'function'
            ? cookieStore.getAll()
            : [];
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookieStore && typeof cookieStore.set === 'function')
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

// Compat shim para rotas API que passam uma função que retorna o store
export async function createRouteSupabase(getCookies?: () => any) {
  const cookieStore = getCookies
    ? await getCookies()
    : await getNextCookieStore();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore && typeof cookieStore.getAll === 'function'
            ? cookieStore.getAll()
            : [];
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookieStore && typeof cookieStore.set === 'function')
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

export default createClient;
