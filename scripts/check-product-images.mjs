#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/check-product-images.mjs <product_id>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Checking product:', id);
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('id,name,images,image_url,image_path,sync_status,sync_error')
    .eq('id', id)
    .maybeSingle();
  if (pErr) {
    console.error('Error fetching product:', pErr.message || pErr);
    process.exit(1);
  }
  console.log('Product row:');
  console.log(JSON.stringify(product, null, 2));

  const { data: imgs, error: iErr } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('position', { ascending: true });
  if (iErr) {
    console.error('Error fetching product_images:', iErr.message || iErr);
    process.exit(1);
  }
  console.log(`Found ${imgs.length} product_images:`);
  imgs.forEach((r, idx) => {
    console.log(
      `${idx}: id=${r.id} status=${r.sync_status} storage_path=${r.storage_path} url=${r.url}`
    );
  });

  // Compare products.images entries to product_images storage_path/optimized_url
  let prodImages = [];
  try {
    prodImages = product?.images ? JSON.parse(product.images) : [];
  } catch (e) {
    console.warn('products.images is not valid JSON');
  }
  console.log('products.images count:', prodImages.length);
  prodImages.forEach((pi, i) => {
    console.log(
      `prod.images[${i}]: storage_path=${pi.storage_path || pi.path || pi.image_path || 'n/a'} optimized_url=${pi.optimized_url || 'n/a'}`
    );
  });

  // Show any synced product_images not referenced in products.images
  const referenced = new Set(
    prodImages.map((p) =>
      (p.storage_path || p.path || p.image_path || '').toString()
    )
  );
  const orphaned = imgs.filter(
    (r) => r.sync_status === 'synced' && !referenced.has(r.storage_path || '')
  );
  console.log(
    'Synced product_images not referenced in products.images:',
    orphaned.length
  );
  orphaned.forEach((o) =>
    console.log(` - ${o.id} path=${o.storage_path} url=${o.optimized_url}`)
  );
}

run().catch((e) => {
  console.error('Failure:', e.message || e);
  process.exit(1);
});
