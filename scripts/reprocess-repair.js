#!/usr/bin/env node
/*
 Script: reprocess-repair.js
 - Busca produtos que têm image_path/image_url contendo '/repair/' e re-enfileira
   o endpoint /api/process-external-image para rebaixar/reprocessar as imagens

 Usage:
   node scripts/reprocess-repair.js

 Requires env:
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL (opcional, default http://localhost:4000)
*/

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';

if (!SUPA || !SERVICE_KEY) {
  console.error('ERROR: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPA, SERVICE_KEY);

function upgradeTo1200w(url) {
  if (!url) return url;
  return url.replace(/-480w(\.[a-zA-Z0-9]+)$/, '-1200w$1');
}

function ensure480w(url) {
  if (!url) return url;
  if (/-480w(\.[a-zA-Z0-9]+)(\?.*)?$/.test(url)) return url;
  if (/-1200w(\.[a-zA-Z0-9]+)(\?.*)?$/.test(url)) return url.replace(/-1200w(\.[a-zA-Z0-9]+)(\?.*)?$/, '-480w$1$2');
  return url.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, '-480w$1$2');
}

function normalizeImageForDB(img) {
  if (!img) return null;

  // If already normalized
  if (img.variants && Array.isArray(img.variants)) {
    const variants = img.variants.map((v) => ({
      ...v,
      path: v.path ? String(v.path).replace(/^\/+/, '').replace(/^public\//i, '') : v.path || null,
      url: v.url ? String(v.url) : v.url,
    }));
    return { ...img, variants };
  }

  let url = '';
  let path = null;
  if (typeof img === 'string') url = img;
  else if (typeof img === 'object') {
    url = String(img.url || img.publicUrl || img.optimized_url || img.optimizedUrl || img.src || '');
    path = img.path || img.storage_path || img.image_path || null;
  }

  try {
    if (url && url.includes('/storage/v1/object/public/')) {
      const extracted = url.split('/storage/v1/object/public/')[1] || '';
      path = extracted || path;
    }
  } catch (e) {}

  let cleanPath = null;
  if (path) {
    cleanPath = String(path).replace(/^\/+/, '').replace(/^public\//i, '');
    cleanPath = cleanPath.replace(/public/gi, '');
    cleanPath = cleanPath.replace(/\\/g, '/');
  }

  const url1200 = upgradeTo1200w(String(url || ''));
  const url480 = ensure480w(String(url || ''));

  const basePath = cleanPath
    ? String(cleanPath).replace(/-(480w|1200w)\.webp$/i, '').replace(/\.[a-zA-Z0-9]+$/, '')
    : null;
  const path1200 = basePath ? `${basePath}-1200w.webp` : null;
  const path480 = basePath ? `${basePath}-480w.webp` : null;

  return {
    url: url1200 || url || null,
    path: path1200,
    variants: [
      { size: 480, url: url480 || url || null, path: path480 },
      { size: 1200, url: url1200 || url || null, path: path1200 },
    ],
  };
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { return { raw: txt, status: res.status }; }
}

async function main() {
  console.log('[reprocess-repair] Starting');

  // 1) Query products that reference repair in image_path/image_url or external_image_url
  const { data: products, error } = await supabase
    .from('products')
    .select('id, external_image_url, image_path, image_url')
    .or("image_path.ilike.%repair/% , image_url.ilike.%repair/% , external_image_url.not.is.null")
    .limit(1000);

  if (error) {
    console.error('Error querying products:', error.message || error);
    process.exit(2);
  }

  console.log(`[reprocess-repair] Found ${products.length} candidate products`);

  const results = [];

  // simple rate-limited queue
  const CONCURRENCY = 4;
  let running = 0;
  let idx = 0;

  async function worker() {
    while (idx < products.length) {
      const i = idx++;
      const prod = products[i];
      if (!prod) continue;

      const productId = prod.id;
      const external = prod.external_image_url;

      if (!external) {
        console.log(`[skip] ${productId} no external_image_url`);
        results.push({ productId, ok: false, reason: 'no external_image_url' });
        continue;
      }

      try {
        console.log(`[call] ${productId} -> ${external}`);
        const url = `${APP_URL.replace(/\/$/, '')}/api/process-external-image`;
        const body = JSON.stringify({ productId, externalUrl: external });
        const out = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        console.log('[resp]', productId, out);
        results.push({ productId, ok: out?.success === true, response: out });

        // If processing succeeded, fetch latest product and persist normalized variants
        if (out?.success === true) {
          try {
            const { data: fresh } = await supabase
              .from('products')
              .select('id, image_url, image_path')
              .eq('id', productId)
              .maybeSingle();

            if (fresh) {
              const normalized = normalizeImageForDB({ url: fresh.image_url, path: fresh.image_path });
              const updatePayload = {};
              if (normalized && normalized.variants) updatePayload.image_variants = normalized.variants;
              if (normalized && normalized.path) updatePayload.image_path = normalized.path;
              if (Object.keys(updatePayload).length > 0) {
                const { error: upErr } = await supabase
                  .from('products')
                  .update(updatePayload)
                  .eq('id', productId);
                if (upErr) console.warn('[reprocess-repair] failed to update variants', productId, upErr.message || upErr);
                else console.log('[reprocess-repair] persisted image_variants for', productId);
              }
            }
          } catch (innerErr) {
            console.error('[reprocess-repair] error persisting normalized variants', innerErr?.message || innerErr);
          }
        }
      } catch (err) {
        console.error('[error] calling process-external-image', err?.message || err);
        results.push({ productId, ok: false, error: String(err) });
      }
    }
  }

  const workers = new Array(CONCURRENCY).fill(0).map(() => worker());
  await Promise.all(workers);

  // write results
  const outPath = path.resolve(process.cwd(), 'reprocess-repair-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('[done] results written to', outPath);
}

main().catch((err) => { console.error(err); process.exit(99); });
