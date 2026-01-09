#!/usr/bin/env node
/**
 * Aplica as funções sync_brands e sync_categories no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  console.log('\n⚠️ Execute manualmente no Supabase SQL Editor:');
  console.log('   node scripts/show-sync-functions.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function applyFunction(name, filePath) {
  console.log(`\n🔧 Aplicando função ${name}...`);

  const sql = readFileSync(filePath, 'utf-8');

  // Tenta aplicar usando uma query SQL direta
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`❌ Erro ao aplicar ${name}:`, error.message);
      return false;
    }

    console.log(`✅ Função ${name} aplicada com sucesso!`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao aplicar ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🚀 APLICANDO FUNÇÕES DE SINCRONIZAÇÃO NO SUPABASE');
  console.log('═'.repeat(80));

  const functions = [
    {
      name: 'sync_brands',
      path: join(__dirname, '..', 'SQL', 'create_sync_brands_function.sql'),
    },
    {
      name: 'sync_categories',
      path: join(__dirname, '..', 'SQL', 'create_sync_categories_function.sql'),
    },
  ];

  let allSuccess = true;

  for (const func of functions) {
    const success = await applyFunction(func.name, func.path);
    if (!success) allSuccess = false;
  }

  console.log('\n' + '═'.repeat(80));

  if (allSuccess) {
    console.log('✅ TODAS AS FUNÇÕES FORAM APLICADAS COM SUCESSO!');
    console.log('\n💡 Agora você pode usar:');
    console.log('   - Dashboard > Marcas > Sincronizar do Catálogo');
    console.log('   - Dashboard > Categorias > Sincronizar do Catálogo');
  } else {
    console.log('⚠️ APLICAÇÃO AUTOMÁTICA FALHOU');
    console.log('\n📋 Execute manualmente no Supabase SQL Editor:');
    console.log('   node scripts/show-sync-functions.mjs');
    console.log('\nDepois copie e cole o SQL no editor do Supabase.');
  }

  console.log('═'.repeat(80));
}

main().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  console.log('\n📋 Execute manualmente no Supabase SQL Editor:');
  console.log('   node scripts/show-sync-functions.mjs');
  process.exit(1);
});
