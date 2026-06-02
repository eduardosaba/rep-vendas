import { createServerClient } from '@supabase/ssr';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, any>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getNextCookieStore() {
  try {
    const mod = await import('next/headers');

    if (mod && typeof mod.cookies === 'function') {
      return await mod.cookies();
    }
  } catch {
    // Em alguns runtimes, next/headers pode não estar disponível.
  }

  return null;
}

function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase variables missing: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
}

function getCookieOptions() {
  return {
    name: 'repvendas-auth-token',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

// Cliente padrão para Server Components, Layouts e Pages
export async function createClient() {
  assertSupabaseEnv();

  const cookieStore: any = await getNextCookieStore();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookieOptions: getCookieOptions(),

    cookies: {
      getAll() {
        if (cookieStore && typeof cookieStore.getAll === 'function') {
          return cookieStore.getAll();
        }

        return [];
      },

      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (cookieStore && typeof cookieStore.set === 'function') {
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              });
            }
          });
        } catch {
          // Server Components normalmente não podem setar cookies.
          // O middleware deve cuidar de atualizar a sessão.
        }
      },
    },
  });
}

// Cliente específico para Route Handlers / API Routes
export async function createRouteSupabase(getCookies?: () => any) {
  assertSupabaseEnv();

  const cookieStore: any = getCookies
    ? await getCookies()
    : await getNextCookieStore();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookieOptions: getCookieOptions(),

    cookies: {
      getAll() {
        if (cookieStore && typeof cookieStore.getAll === 'function') {
          return cookieStore.getAll();
        }

        return [];
      },

      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (cookieStore && typeof cookieStore.set === 'function') {
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              });
            }
          });
        } catch {
          // Em Server Components isso pode falhar.
          // Em Route Handlers normalmente funciona.
        }
      },
    },
  });
}

export default createClient;
