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
  console.error('Usage: node scripts/get-product.mjs PRODUCT_ID');
  process.exit(1);
}

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id,reference_code,name,images,external_image_url,image_url,image_path,image_variants,gallery_images,sync_status,sync_error')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Supabase error:', error.message || error);
    process.exit(2);
  }
  console.log(JSON.stringify(data, null, 2));
}

run().catch((e) => { console.error(e); process.exit(3); });
