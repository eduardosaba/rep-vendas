#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const [, , ...brandParts] = process.argv;
const brand = (brandParts || []).join(' ');
if (!brand) {
  console.error('Usage: node scripts/list-brand-status.mjs "brand name"');
  process.exit(2);
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
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,sync_status,sync_error,updated_at')
      .ilike('brand', `%${brand}%`)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const counts = products.reduce((acc, p) => {
      acc[p.sync_status] = (acc[p.sync_status] || 0) + 1;
      return acc;
    }, {});

    console.log(
      JSON.stringify({ brand, total: products.length, counts }, null, 2)
    );

    const interesting = products.filter(
      (p) => p.sync_status === 'failed' || p.sync_status === 'pending'
    );
    if (interesting.length === 0) {
      console.log('No failed/pending products found for this brand.');
      return;
    }

    console.log('\nListing up to 50 failed/pending products:');
    for (const p of interesting.slice(0, 50)) {
      console.log(
        `- ${p.id} | ${p.name} | ${p.sync_status} | ${p.sync_error || ''}`
      );
    }

    // fetch product_images for those items (first 50)
    const ids = interesting.slice(0, 50).map((p) => p.id);
    const { data: images, error: imgErr } = await supabase
      .from('product_images')
      .select(
        'id,product_id,url,optimized_url,storage_path,sync_status,sync_error,created_at'
      )
      .in('product_id', ids)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (imgErr) throw imgErr;

    console.log('\nproduct_images for matched products:');
    for (const img of images || []) {
      console.log(
        `- ${img.product_id} | ${img.id} | ${img.sync_status} | ${img.url} | ${img.optimized_url} | ${img.storage_path}`
      );
    }
  } catch (err) {
    console.error('Error querying Supabase:', err.message || err);
    process.exit(1);
  }
}

run();
