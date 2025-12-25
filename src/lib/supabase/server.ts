import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Função principal nomeada
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => {
            const baseName = c.name.replace('__Secure-', '');
            return { name: baseName, value: c.value };
          });
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
                const isProd = process.env.NODE_ENV === 'production';
                const finalName = isProd ? `__Secure-${name}` : name;
                cookieStore.set(finalName, value, {
                  ...options,
                  secure: isProd,
                  domain: isProd ? '.repvendas.com.br' : undefined,
                });
              }
            );
          } catch {}
        },
      },
    }
  );
}

// Export default para compatibilidade com rotas legadas
export default createClient;

// Alias/compat helper para rotas que podiam passar um cookieStore getter
export async function createRouteSupabase(cookieStoreOrGetter?: any) {
  // Compatibilidade com rotas legadas:
  // - se for passado um cookieStore / getter / array, retornamos um SupabaseClient SÍNCRONO
  // - se nenhum argumento for passado, delegamos para createClient() (assíncrono)

  if (typeof cookieStoreOrGetter !== 'undefined') {
    // Obtemos o resultado do getter (pode ser array ou cookieStore)
    const result =
      typeof cookieStoreOrGetter === 'function'
        ? cookieStoreOrGetter()
        : cookieStoreOrGetter;

    let cookieArray: Array<{ name: string; value: string }> = [];
    let setter: ((name: string, value: string, options?: any) => void) | null =
      null;

    if (Array.isArray(result)) {
      cookieArray = result.map((c: any) => ({
        name: String(c.name),
        value: String(c.value),
      }));
    } else if (result && typeof result.getAll === 'function') {
      cookieArray = result
        .getAll()
        .map((c: any) => ({ name: String(c.name), value: String(c.value) }));
      if (typeof result.set === 'function') {
        setter = (name: string, value: string, options?: any) =>
          (result as { set: (n: string, v: string, o?: any) => void }).set(
            name,
            value,
            options
          );
      }
    }

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieArray.map((c) => ({
              name: c.name.replace('__Secure-', ''),
              value: c.value,
            }));
          },
          setAll(
            cookiesToSet: Array<{ name: string; value: string; options?: any }>
          ) {
            try {
              if (!setter) return;
              cookiesToSet.forEach(({ name, value, options }) => {
                const isProd = process.env.NODE_ENV === 'production';
                const finalName = isProd ? `__Secure-${name}` : name;
                setter(finalName, value, {
                  ...options,
                  secure: isProd,
                  domain: isProd ? '.repvendas.com.br' : undefined,
                });
              });
            } catch {}
          },
        },
      }
    );
  }

  // Sem argumento: retorna Promise<SupabaseClient> via createClient()
  return createClient();
}
