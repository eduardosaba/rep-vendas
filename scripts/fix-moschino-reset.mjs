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

async function fixMoschino() {
  console.log(`\n🔍 Analisando produtos da marca MOSCHINO por data de criação...`);

  // Data limite de hoje (2026-09-02 UTC/local)
  const todayIso = new Date().toISOString().split('T')[0];
  console.log(`📅 Data de hoje considerada: >= ${todayIso}`);

  // 1. Produtos antigos (criados ANTES de hoje) que já possuem foto internalizada no storage ou image_variants
  const { data: olderProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, reference_code, created_at, image_path, image_variants, gallery_images')
    .ilike('brand', '%MOSCHINO%')
    .lt('created_at', todayIso);

  if (fetchErr) {
    console.error('❌ Erro ao buscar produtos antigos:', fetchErr.message);
    process.exit(1);
  }

  console.log(`📦 Produtos antigos encontrados (criados antes de hoje): ${olderProducts.length}`);

  // Restaurar status para 'synced' dos produtos antigos
  if (olderProducts.length > 0) {
    const olderIds = olderProducts.map((p) => p.id);
    
    // Atualizar em chunks de 500
    let restoredCount = 0;
    const chunkSize = 500;
    for (let i = 0; i < olderIds.length; i += chunkSize) {
      const chunk = olderIds.slice(i, i + chunkSize);
      const { error: updErr, count } = await supabase
        .from('products')
        .update({
          sync_status: 'synced',
          image_optimized: true,
          sync_error: null,
        })
        .in('id', chunk)
        .select('id', { count: 'exact' });

      if (updErr) {
        console.error('❌ Erro ao restaurar produtos antigos:', updErr.message);
      } else {
        restoredCount += typeof count === 'number' ? count : chunk.length;
      }
    }
    console.log(`✅ Restaurados ${restoredCount} produtos antigos para 'synced'.`);
  }

  // 2. Produtos de HOJE (lançamentos)
  const { data: todayProducts, error: todayErr } = await supabase
    .from('products')
    .select('id, name, reference_code, created_at')
    .ilike('brand', '%MOSCHINO%')
    .gte('created_at', todayIso);

  if (todayErr) {
    console.error('❌ Erro ao buscar lançamentos de hoje:', todayErr.message);
  } else {
    console.log(`🔥 Lançamentos importados hoje mantidos como 'pending': ${todayProducts.length}`);
  }

  console.log(`\n🎉 Correção concluída! Apenas os lançamentos de hoje ficaram pendentes para o local-sync-full.mjs.\n`);
}

fixMoschino().catch(console.error);
