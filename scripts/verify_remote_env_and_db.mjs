/**
 * Verification Script: Safe Read-Only Remote Inspection
 * Run with: node scripts/verify_remote_env_and_db.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

console.log('=== VERIFICAÇÃO DE PROJETO E SCHEMA REMOTO ===\n');

// 1. Identificação do Projeto Alvo
let projectRef = 'Desconhecido';
if (supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) projectRef = match[1];
}

console.log(`📌 Projeto Supabase URL: ${supabaseUrl}`);
console.log(`📌 Supabase Project Ref: ${projectRef}`);
console.log(`📌 Service Role Key Disponível: ${serviceRoleKey ? 'SIM (oculta por segurança)' : 'NÃO'}\n`);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Credenciais de ambiente indisponíveis. Verifique .env ou .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkRemoteTables() {
  console.log('🔍 Auditando tabelas de limpeza de storage no banco remoto...\n');

  const tablesToCheck = [
    'storage_cleanup_operations',
    'storage_cleanup_items',
    'order_pdf_cleanup_items',
  ];

  const results = {};

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          results[table] = { exists: false, error: 'Tabela ainda não existe no banco remoto' };
        } else {
          results[table] = { exists: false, error: error.message };
        }
      } else {
        results[table] = { exists: true, count: data || 0 };
      }
    } catch (e) {
      results[table] = { exists: false, error: String(e) };
    }
  }

  console.log('📊 STATUS DAS TABELAS NO BANCO REMOTO:');
  Object.keys(results).forEach((tbl) => {
    const res = results[tbl];
    if (res.exists) {
      console.log(`  ✅ ${tbl}: EXISTE NO BANCO REMOTO`);
    } else {
      console.log(`  ⚠️  ${tbl}: PENDENTE DE APLICAÇÃO (${res.error})`);
    }
  });

  return results;
}

checkRemoteTables();
