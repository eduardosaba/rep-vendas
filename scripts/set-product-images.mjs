#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const id = process.argv[2];
const url = process.argv[3];
if (!id || !url) {
  console.error('Usage: node scripts/set-product-images.mjs <product_id> <image_url>');
  process.exit(1);
}

async function run() {
  const images = [url];
  const { error } = await supabase.from('products').update({ images, external_image_url: url, image_url: url, sync_status: 'pending', sync_error: null }).eq('id', id);
  if (error) {
    console.error('Update failed:', error.message || error);
    process.exit(2);
  }
  console.log('Product updated, set images and pending sync');
}

run().catch((e) => { console.error(e); process.exit(3); });
