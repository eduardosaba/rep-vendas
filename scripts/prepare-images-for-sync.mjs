#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((x) => {
        if (!x) return null;
        if (typeof x === 'string') return x.trim();
        return (x.url || x.src || x.path || '').trim();
      })
      .filter((u) => typeof u === 'string' && u.startsWith('http'));
  }
  if (typeof input === 'string') {
    return input
      .split(/[;,]/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));
  }
  if (typeof input === 'object') {
    const one = (input.url || input.src || input.path || '').trim();
    return one.startsWith('http') ? [one] : [];
  }
  return [];
}

async function fetchProductImageUrls(productId) {
  const { data: rows, error } = await supabase
    .from('product_images')
    .select('url, optimized_url, position')
    .eq('product_id', productId)
    .order('position', { ascending: true })
    .limit(20);

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const urls = [];
  for (const row of rows) {
    const candidate = row.url || row.optimized_url;
    if (typeof candidate === 'string' && candidate.startsWith('http')) urls.push(candidate);
  }
  return urls;
}

async function main() {
  const CHUNK = Number(process.env.PREP_CHUNK_SIZE || 500);
  let from = 0;
  let totalUpdated = 0;

  console.log('Preparing products for sync...');

  while (true) {
    const to = from + CHUNK - 1;
    const { data: products, error } = await supabase
      .from('products')
      .select('id, reference_code, images, image_url, external_image_url, sync_status, image_path')
      .in('sync_status', ['pending', 'failed'])
      .range(from, to);

    if (error) {
      console.error('Error loading products:', error.message || error);
      process.exit(2);
    }

    if (!products || products.length === 0) break;

    for (const p of products) {
      // Keep already internalized rows untouched
      if (p.image_path) continue;

      const existing = [
        ...normalizeUrls(p.images),
        ...normalizeUrls(p.image_url),
        ...normalizeUrls(p.external_image_url),
      ];

      if (existing.length > 0) continue;

      const galleryUrls = await fetchProductImageUrls(p.id);
      if (galleryUrls.length === 0) continue;

      const { error: upErr } = await supabase
        .from('products')
        .update({
          images: galleryUrls,
          sync_status: 'pending',
          sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id);

      if (upErr) {
        console.warn(`Failed update for ${p.id} (${p.reference_code || 'sem-ref'}):`, upErr.message || upErr);
        continue;
      }

      totalUpdated += 1;
      console.log(`Prepared ${p.id} (${p.reference_code || 'sem-ref'}) with ${galleryUrls.length} URL(s) from product_images`);
    }

    from += products.length;
    if (products.length < CHUNK) break;
  }

  console.log(`Preparation done. Updated: ${totalUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
