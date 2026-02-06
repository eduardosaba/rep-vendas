#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('brand', {
    type: 'string',
    description: 'Filtrar por brand (opcional)',
  })
  .option('limit', {
    type: 'number',
    description: 'Limitar produtos processados',
    default: 1000,
  })
  .option('dry-run', {
    type: 'boolean',
    default: true,
    description: 'Somente mostrar o que seria feito',
  })
  .option('product', {
    type: 'string',
    description: 'Processar somente este product_id',
  })
  .help()
  .parseSync();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const backupsDir = path.join(process.cwd(), 'backups', 'reconcile');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

async function fetchProductBatch() {
  if (argv.product) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', argv.product)
      .maybeSingle();
    return data ? [data] : [];
  }

  let q = supabase
    .from('products')
    .select('id,name,brand,images,sync_status')
    .limit(argv.limit);
  if (argv.brand) q = q.ilike('brand', `%${argv.brand}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function countSyncedImages(productId) {
  const { data } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', productId)
    .eq('sync_status', 'synced')
    .limit(1);
  if (!data) return 0;
  // For efficiency if DB supports count via head, but fall back to simple count by fetching a reasonable batch
  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: false })
    .eq('product_id', productId)
    .eq('sync_status', 'synced');
  return Number(count || data.length || 0);
}

async function fetchSyncedImages(productId) {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .eq('sync_status', 'synced')
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

function buildImagesFromRows(rows) {
  return rows.map((r) => {
    let variants = [];
    try {
      variants = JSON.parse(r.optimized_variants || '[]');
    } catch (e) {
      variants = [];
    }
    return {
      id: r.id,
      url: r.optimized_url || r.url,
      path: r.storage_path,
      is_primary: r.is_primary || false,
      position: r.position || 0,
      optimized_variants: variants,
    };
  });
}

async function backupProduct(product, imgs) {
  const out = { product, product_images: imgs };
  const file = path.join(backupsDir, `${product.id}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  return file;
}

async function reconcileProduct(product) {
  const syncedCount = await countSyncedImages(product.id);
  let prodImagesCount = 0;
  try {
    prodImagesCount = Array.isArray(product.images)
      ? product.images.length
      : JSON.parse(product.images || '[]').length;
  } catch (e) {
    prodImagesCount = -1;
  }

  if (syncedCount === prodImagesCount && prodImagesCount >= 0) {
    return { action: 'skip', reason: 'already matched' };
  }

  const syncedRows = await fetchSyncedImages(product.id);
  const backupFile = await backupProduct(product, syncedRows);

  const newImages = buildImagesFromRows(syncedRows);

  if (argv['dry-run']) {
    return {
      action: 'dry-run',
      id: product.id,
      name: product.name,
      old_count: prodImagesCount,
      new_count: newImages.length,
      backup: backupFile,
    };
  }

  const imagePath =
    (syncedRows.find((r) => r.is_primary) || syncedRows[0])?.storage_path ||
    null;

  const { error } = await supabase
    .from('products')
    .update({
      images: JSON.stringify(newImages),
      image_path: imagePath,
      sync_status: newImages.length > 0 ? 'synced' : 'pending',
      sync_error: null,
    })
    .eq('id', product.id);

  if (error) return { action: 'error', error: error.message || error };
  return {
    action: 'updated',
    id: product.id,
    name: product.name,
    new_count: newImages.length,
    backup: backupFile,
  };
}

async function run() {
  console.log(`Reconciling products (dry-run=${argv['dry-run']})...`);
  const products = await fetchProductBatch();
  console.log(`Fetched ${products.length} products to inspect.`);

  const mismatches = [];
  for (const p of products) {
    try {
      const result = await reconcileProduct(p);
      if (result.action && result.action !== 'skip') mismatches.push(result);
      console.log(JSON.stringify(result));
    } catch (e) {
      console.error('Error processing product', p.id, e.message || e);
    }
  }

  console.log(`Done. Candidates: ${mismatches.length}`);
  if (argv['dry-run'])
    console.log(
      'Run without --dry-run to apply changes. Backup files are in',
      backupsDir
    );
}

run().catch((e) => {
  console.error('Failure:', e.message || e);
  process.exit(1);
});
