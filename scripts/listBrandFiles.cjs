#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPA || !SERVICE) {
  console.error('Supabase credentials not found in env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPA, SERVICE);
const bucket = process.argv[2] || 'product-images';
const prefix = process.argv[3] || 'fe7ea2fc-afd4-4310-a080-266fca8186a7/branding/';

(async () => {
  try {
    console.log('Listing', { bucket, prefix });
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (error) {
      console.error('Supabase list error:', error.message || error);
      process.exit(2);
    }
    console.log('Files:', JSON.stringify(data || [], null, 2));
  } catch (e) {
    console.error('Unexpected error:', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
