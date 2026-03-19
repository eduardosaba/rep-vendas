#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/populate-images-from-product_images.mjs PRODUCT_ID');
  process.exit(1);
}

async function run() {
  const { data: rows, error } = await supabase
    .from('product_images')
    .select('url,position')
    .eq('product_id', id)
    .order('position', { ascending: true });

  if (error) { console.error('Supabase error:', error); process.exit(2); }
  if (!rows || rows.length === 0) {
    console.log('No product_images rows found for', id);
    process.exit(0);
  }

  const urls = rows.map((r) => r.url).filter(Boolean);
  if (urls.length === 0) {
    console.log('No urls found in product_images for', id);
    process.exit(0);
  }

  // Update product: set images array (cover first), clear external_image_url/image_url
  const { error: upErr } = await supabase
    .from('products')
    .update({ images: urls, external_image_url: null, image_url: null, sync_status: 'pending' })
    .eq('id', id);

  if (upErr) { console.error('Failed to update product:', upErr); process.exit(3); }

  console.log(`Updated product ${id} with ${urls.length} images.`);
}

run().catch((e) => { console.error(e); process.exit(99); });
