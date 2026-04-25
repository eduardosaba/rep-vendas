#!/usr/bin/env node
// Backfill script (CommonJS): calls RPC sync_product_properties_to_clones to copy
// properties material, polarizado, fotocromatico from source -> clones.

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in env');
    process.exit(1);
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('Starting backfill: material, polarizado, fotocromatico');
    const props = ['material', 'polarizado', 'fotocromatico'];
    const { data, error } = await svc.rpc('sync_product_properties_to_clones', {
      p_source_user_id: null,
      p_target_user_id: null,
      p_brands: null,
      p_properties: props,
    });

    if (error) {
      console.error('RPC error:', error);
      process.exit(2);
    }

    console.log('RPC result:', data);
    console.log('Backfill completed');
    process.exit(0);
  } catch (e) {
    console.error('Unexpected error', e);
    process.exit(3);
  }
}

if (require.main === module) main();
