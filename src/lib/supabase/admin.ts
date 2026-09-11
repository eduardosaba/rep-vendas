import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com permissões de Service Role (Admin).
 * 
 * ATENÇÃO DE SEGURANÇA:
 * Este módulo possui a diretiva `import 'server-only'` para garantir
 * que o Bundler do Next.js bloqueie qualquer tentativa de importá-lo no navegador.
 * Deve ser consumido exclusivamente dentro de Server Actions ou Server Components autorizados.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração pendente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
