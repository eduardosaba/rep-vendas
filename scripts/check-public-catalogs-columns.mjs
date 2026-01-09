#!/usr/bin/env node
/**
 * Verifica as colunas da tabela public_catalogs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Conectando ao Supabase...\n');

  // Query para verificar colunas da tabela public_catalogs
  const { data, error } = await supabase
    .from('public_catalogs')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ Erro ao consultar public_catalogs:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ Tabela public_catalogs está vazia');
    return;
  }

  console.log('✅ Colunas encontradas em public_catalogs:');
  console.log(Object.keys(data).sort().join('\n'));

  console.log('\n📋 Verificando campos específicos de banners:');
  console.log(
    'banners:',
    typeof data.banners,
    Array.isArray(data.banners) ? `Array(${data.banners.length})` : data.banners
  );
  console.log(
    'banners_mobile:',
    typeof data.banners_mobile,
    Array.isArray(data.banners_mobile)
      ? `Array(${data.banners_mobile.length})`
      : data.banners_mobile
  );
}

checkColumns().catch(console.error);
