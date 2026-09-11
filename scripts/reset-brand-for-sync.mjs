#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const customFetch = (url, options) => fetch(url, { ...options, agent });

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: customFetch },
  auth: { persistSession: false },
});

const BRAND = process.argv[2] || 'MOSCHINO';

async function resetBrand() {
  console.log(`\n🔄 Resetando status de sincronização para a marca: "${BRAND}"...`);

  // Marcar produtos da marca como pending para o local-sync-full.mjs reprocessar
  const { data, error, count } = await supabase
    .from('products')
    .update({
      sync_status: 'pending',
      sync_error: null,
      image_optimized: false,
    })
    .ilike('brand', `%${BRAND}%`)
    .select('id', { count: 'exact' });

  if (error) {
    console.error('❌ Erro ao atualizar produtos:', error.message);
    process.exit(1);
  }

  const total = typeof count === 'number' ? count : (data ? data.length : 0);
  console.log(`✅ ${total} produtos da marca "${BRAND}" foram marcados como 'pending'.`);
  console.log(`\n👉 Agora você pode rodar:`);
  console.log(`   node scripts/local-sync-full.mjs "${BRAND}"\n`);
}

resetBrand().catch(console.error);
