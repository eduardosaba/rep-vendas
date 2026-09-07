/**
 * Read-Only Remote Schema Inspector
 * Run with: node scripts/inspect_remote_schema.mjs
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

console.log('=== AUDITORIA DE SCHEMA E RLS NO BANCO REMOTO ===\n');

async function inspectSchema() {
  const tables = ['storage_cleanup_operations', 'storage_cleanup_items', 'order_pdf_cleanup_items'];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`❌ ${t}: Erro de consulta: ${error.message}`);
      } else {
        console.log(`✅ ${t}: Acessível via Service Role. Registros encontrados: ${data.length}`);
      }
    } catch (e) {
      console.log(`❌ ${t}: Exceção: ${e}`);
    }
  }

  console.log('\n🔒 Testando isolamento e RLS para cliente anônimo (anon)...');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey);
    for (const t of tables) {
      const { data, error } = await anonClient.from(t).select('*').limit(1);
      if (error || !data || data.length === 0) {
        console.log(`  🛡️  ${t}: Anon bloqueado / sem dados expostos (${error ? error.message : '0 linhas retornadas'})`);
      } else {
        console.warn(`  ⚠️  ${t}: Anon conseguiu ler dados!`);
      }
    }
  }
}

inspectSchema();
