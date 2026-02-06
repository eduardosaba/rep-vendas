#!/usr/bin/env node
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const [, , brandArg] = process.argv;
const brand = brandArg || 'tommy hilfiger';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Fetching products for brand:', brand);
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,sync_status,image_url,external_image_url,images')
    .ilike('brand', `%${brand}%`)
    .in('sync_status', ['pending', 'failed'])
    .limit(100);

  if (pErr) {
    console.error('Error fetching products:', pErr.message || pErr);
    process.exit(1);
  }

  console.log(`Found ${products.length} products (pending/failed).`);

  for (const prod of products) {
    try {
      // find a candidate URL to requeue
      let url = null;
      // try product_images pending rows
      const { data: imgs } = await supabase
        .from('product_images')
        .select('id,url,optimized_url,storage_path,sync_status')
        .eq('product_id', prod.id)
        .limit(10);

      if (imgs && imgs.length > 0) {
        const pending = imgs.find((i) => i.sync_status !== 'synced');
        if (pending) url = pending.url || pending.optimized_url || null;
        else url = imgs[0].optimized_url || imgs[0].url || null;
      }

      if (!url) {
        if (prod.image_url)
          url =
            typeof prod.image_url === 'string'
              ? prod.image_url
              : prod.image_url.url || null;
        if (!url && prod.external_image_url) url = prod.external_image_url;
        if (
          !url &&
          prod.images &&
          Array.isArray(prod.images) &&
          prod.images.length
        ) {
          const first = prod.images[0];
          url =
            typeof first === 'string' ? first : first.url || first.path || null;
        }
      }

      if (!url) {
        console.log(`Skipping ${prod.id} (${prod.name}) — no candidate URL`);
        continue;
      }

      // try local API first
      const apiUrl =
        (process.env.DEV_URL || 'http://localhost:3000').replace(/\/$/, '') +
        '/api/admin/mark-image-pending';
      let apiOk = false;
      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: prod.id, url }),
          timeout: 15000,
        });
        if (resp.ok) {
          const j = await resp.json();
          console.log(
            `API enqueued ${prod.id} -> ${url} => ${j.success ? 'ok' : JSON.stringify(j)}`
          );
          apiOk = true;
        } else {
          const t = await resp.text();
          console.warn(`API returned ${resp.status} for ${prod.id}: ${t}`);
        }
      } catch (e) {
        console.warn(
          'API call failed, will fallback to DB update:',
          e.message || e
        );
      }

      if (!apiOk) {
        // fallback: ensure product_images row exists and set pending
        const up = await supabase.from('product_images').upsert(
          {
            product_id: prod.id,
            url,
            sync_status: 'pending',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'product_id,url' }
        );
        if (up.error)
          console.error('Upsert image failed', up.error.message || up.error);
        // mark product pending
        const pu = await supabase
          .from('products')
          .update({
            sync_status: 'pending',
            sync_error: 'Reenfileiramento manual',
          })
          .eq('id', prod.id);
        if (pu.error)
          console.error(
            'Mark product pending failed',
            pu.error.message || pu.error
          );
        console.log(`DB enqueued ${prod.id} -> ${url}`);
      }
    } catch (err) {
      console.error('Error processing product', prod.id, err.message || err);
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
