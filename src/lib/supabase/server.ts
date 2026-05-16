import { createServerClient } from '@supabase/ssr';

async function getNextCookieStore() {
  try {
    const mod = await import('next/headers');
    if (mod && typeof mod.cookies === 'function') {
      // cookies() pode ser async em versões recentes do Next.js
      return await (mod.cookies as any)();
    }
  } catch (e) {
    // Não disponível em runtimes específicos (ex: Pages dir)
  }
  return null;
}

// Cliente padrão para Server Components e Layouts
export async function createClient() {
  const cookieStore: any = await getNextCookieStore();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // No build, se as variáveis não existirem, lançamos um erro 
    // ou retornamos null para evitar o crash 401
    throw new Error('Supabase variables missing: NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY');
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore && typeof cookieStore.getAll === 'function'
            ? cookieStore.getAll()
            : [];
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookieStore && typeof cookieStore.set === 'function')
                cookieStore.set(name, value, options);
            });
          } catch {
            // Silencioso em Server Components (onde não se pode setar cookies)
          }
        },
      },
    }
  );
}

// Cliente específico para API Routes (Route Handlers)
export async function createRouteSupabase(getCookies?: () => any) {
  const cookieStore = getCookies
    ? await getCookies()
    : await getNextCookieStore();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase variables missing for Route Client');
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore && typeof cookieStore.getAll === 'function' 
            ? cookieStore.getAll() 
            : [];
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookieStore && typeof cookieStore.set === 'function') 
                cookieStore.set(name, value, options);
            });
          } catch { }
        },
      },
    }
  );
}

export default createClient;