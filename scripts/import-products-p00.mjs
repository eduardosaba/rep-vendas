#!/usr/bin/env node
/*
  scripts/import-products-p00.mjs

  Usage:
    node scripts/import-products-p00.mjs data/products-to-import.json

  Each input item must be an object like:
  {
    "name": "Produto X",
    "reference_code": "REF123",
    "brand": "Marca",
    "category": "Categoria",
    "external_urls": ["https://.../IMG_P00.jpg", "https://.../IMG_P01.jpg"],
    "other_fields": { ... } // optional extra columns to be spread into products
  }

  Options:
    --normalize-status   -> run SQL to normalize statuses (sets any non-'pending' to 'pending' or NULL)

  Notes:
    - This script runs as a privileged script and expects `SUPABASE_SERVICE_ROLE_KEY` in env.
    - Review the generated report before running in production.
*/

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const argvEarly = process.argv.slice(2);
const isDryRunEarly = argvEarly.includes('--dry-run');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!isDryRunEarly && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  );
  process.exit(1);
}

let supabase = null;
if (!isDryRunEarly) {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function chooseP00(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return null;
  const found = urls.find((u) => /[_-]P00\./i.test(u) || /P00\./i.test(u));
  return found || urls[0];
}

async function importFromFile(filePath, opts = {}) {
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`Input file not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items))
    throw new Error('Input JSON must be an array of products');

  const report = [];

  for (const it of items) {
    try {
      const external_urls = Array.isArray(it.external_urls)
        ? it.external_urls
        : [];
      const cover = chooseP00(external_urls);

      const productPayload = {
        name: it.name || it.title || null,
        reference_code: it.reference_code || it.ref || null,
        brand: it.brand || null,
        category: it.category || null,
        image_url: cover || null,
        images: external_urls.length ? external_urls : null,
        sync_status: 'pending',
        image_path: null,
        // spread any other allowed fields (caution)
        ...(it.other_fields || {}),
      };

      if (opts.dryRun) {
        // Do not insert, but simulate result
        const simulatedId = `dry-${Math.random().toString(36).slice(2, 9)}`;
        const gallery = (external_urls || []).map((url, idx) => ({
          product_id: simulatedId,
          url,
          position: url === cover ? 0 : idx + 1,
          sync_status: 'pending',
        }));
        report.push({
          id: simulatedId,
          name: productPayload.name,
          status: 'dry-run',
          cover,
          gallery,
        });
        console.log(
          '[import] dry-run simulated',
          simulatedId,
          productPayload.name
        );
      } else {
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .limit(1)
          .single();

        if (prodErr) throw prodErr;

        const gallery = (external_urls || []).map((url, idx) => ({
          product_id: product.id,
          url,
          position: url === cover ? 0 : idx + 1,
          sync_status: 'pending',
        }));

        if (gallery.length > 0) {
          const { error: gErr } = await supabase
            .from('product_images')
            .insert(gallery);
          if (gErr)
            console.warn(
              'Warning: product_images insert failed for',
              product.id,
              gErr.message || gErr
            );
        }

        report.push({
          id: product.id,
          name: productPayload.name,
          status: 'inserted',
        });
        console.log('[import] inserted', product.id, productPayload.name);
      }
    } catch (err) {
      console.error(
        '[import] error for item',
        it?.name || it?.reference_code || '<unknown>',
        err?.message || err
      );
      report.push({
        id: null,
        name: it?.name || null,
        error: String(err?.message || err),
      });
    }
  }

  const out = path.join(
    process.cwd(),
    'reports',
    `import-report-${new Date().toISOString().slice(0, 10)}.json`
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Import finished — report:', out);
}

async function normalizeStatuses() {
  console.log('Normalizing product sync_status -> pending where needed...');
  const sql = `UPDATE products SET sync_status = 'pending' WHERE sync_status IS NULL OR LOWER(sync_status) != 'pending'`;
  const { error } = await supabase
    .rpc('sql', { q: sql })
    .catch(() => ({ error: true }));
  // Note: not all Supabase setups expose a general SQL RPC; fallback to client update
  if (error) {
    console.log('Falling back to batch update via client');
    // fetch IDs then update in batch
    const { data } = await supabase
      .from('products')
      .select('id')
      .limit(1000)
      .neq('sync_status', 'pending');
    if (data && data.length) {
      const ids = data.map((r) => r.id);
      const { error: updErr } = await supabase
        .from('products')
        .update({ sync_status: 'pending' })
        .in('id', ids);
      if (updErr) console.error('Batch update error', updErr);
    }
  }
  console.log('Normalize complete');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error(
      'Usage: node scripts/import-products-p00.mjs <input.json> [--normalize-status]'
    );
    process.exit(1);
  }
  const input = argv[0];
  const doNormalize = argv.includes('--normalize-status');
  const doDryRun = argv.includes('--dry-run');

  await importFromFile(input, { dryRun: doDryRun });

  if (doNormalize) await normalizeStatuses();
}

main().catch((err) => {
  console.error('Fatal import error', err);
  process.exit(2);
});
