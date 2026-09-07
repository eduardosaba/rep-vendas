import { createClient } from '@supabase/supabase-js';

let _supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

/**
 * Retorna o cliente administrativo (Service Role) inicializado no servidor.
 * Valida estritamente as variáveis de ambiente sem ocultar erros.
 */
export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('Erro de Segurança: getSupabaseAdmin() não pode ser executado no navegador.');
  }

  if (!_supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Configuração de Supabase URL ou Service Role Key ausente no ambiente do servidor.');
    }

    _supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _supabaseAdminInstance;
}

/**
 * Proxy de retrocompatibilidade para chamadas existentes no servidor.
 */
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});

