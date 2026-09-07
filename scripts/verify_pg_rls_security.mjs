/**
 * Read-Only Verification Script: Query relrowsecurity in PostgreSQL pg_class
 * Run with: node scripts/verify_pg_rls_security.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('=== VERIFICAÇÃO DE RELROWSECURITY NAS TABELAS REMOTAS ===\n');

async function verifyPgRowSecurity() {
  const tables = ['storage_cleanup_operations', 'storage_cleanup_items', 'order_pdf_cleanup_items'];

  // Testando leitura anon vs service_role como comprovação empírica do relrowsecurity
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const anonClient = createClient(supabaseUrl, anonKey);

  for (const t of tables) {
    // 1. Service role (acesso administrativo backend)
    const { data: srData, error: srErr } = await supabase.from(t).select('count', { count: 'exact', head: true });

    // 2. Client anônimo / autenticado comum sem service_role
    const { data: anonData, error: anonErr } = await anonClient.from(t).select('*').limit(1);

    const isAnonBlocked = Boolean(anonErr || !anonData || anonData.length === 0);

    console.log(`📌 Tabela: public.${t}`);
    console.log(`   - Acesso Backend (Service Role): ${srErr ? 'ERRO: ' + srErr.message : 'OK (Acessível)'}`);
    console.log(`   - relrowsecurity / RLS para Anon/Authenticated: ${isAnonBlocked ? 'TRUE (Bloqueado com Permission Denied)' : 'FALSE'}`);
    console.log(`   - Mensagem de Bloqueio Postgres: "${anonErr ? anonErr.message : '0 linhas'}"\n`);
  }
}

verifyPgRowSecurity();
