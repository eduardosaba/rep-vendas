#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const storageMarker = '/product-images/';

function extractPathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const idx = url.indexOf(storageMarker);
  if (idx === -1) return null;
  return url.slice(idx + 1); // remove leading slash -> 'product-images/…'
}

async function processBatch(offset = 0, limit = 1000) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, image_url, images')
    .is('image_path', null)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!products || products.length === 0) return 0;

  let updated = 0;

  for (const p of products) {
    try {
      // prefer main image_url
      let candidate = null;
      if (p.image_url && p.image_url.includes(storageMarker)) candidate = p.image_url;

      if (!candidate && Array.isArray(p.images)) {
        for (const img of p.images) {
          const url = typeof img === 'string' ? img : img?.url;
          if (url && url.includes(storageMarker)) {
            candidate = url;
            break;
          }
        }
      }

      if (!candidate) continue;

      const imagePath = extractPathFromPublicUrl(candidate);
      if (!imagePath) continue;

      const { error: updErr } = await supabase
        .from('products')
        .update({ image_path: imagePath, updated_at: new Date().toISOString() })
        .eq('id', p.id);

      if (updErr) {
        console.error(`Falha ao atualizar ${p.id}:`, updErr.message || updErr);
        continue;
      }

      updated++;
      console.log(`Atualizado ${p.id} -> ${imagePath}`);
    } catch (e) {
      console.error('Erro no loop:', e);
    }
  }

  return updated;
}

async function main() {
  console.log('Iniciando correção de produtos internalizados...');
  let offset = 0;
  const limit = 500;
  let totalUpdated = 0;

  while (true) {
    const updated = await processBatch(offset, limit);
    if (updated === 0) break;
    totalUpdated += updated;
    offset += limit;
  }

  console.log(`Concluído. Produtos atualizados: ${totalUpdated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
