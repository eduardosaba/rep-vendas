#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env'
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      'Usage: node scripts/clone-test.mjs <source_user_id> <target_user_id> [brand1,brand2,...]'
    );
    process.exit(1);
  }

  const [sourceUserId, targetUserId, brandsCsv] = args;
  const brands = brandsCsv ? brandsCsv.split(',').map((s) => s.trim()) : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // counts before
    const { data: beforeSrc } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('user_id', sourceUserId);
    const { data: beforeTgt } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('user_id', targetUserId);
    console.log(
      'Before: source products=',
      beforeSrc?._count || beforeSrc?.length || 0,
      ' target products=',
      beforeTgt?._count || beforeTgt?.length || 0
    );

    // call RPC
    console.log('Calling RPC clone_catalog_smart...', {
      sourceUserId,
      targetUserId,
      brands,
    });
    const { data, error } = await supabase.rpc('clone_catalog_smart', {
      source_user_id: sourceUserId,
      target_user_id: targetUserId,
      brands_to_copy: brands,
    });
    if (error) throw error;
    console.log('RPC result:', data);

    // counts after
    const { data: afterTgt } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('user_id', targetUserId);
    console.log(
      'After: target products=',
      afterTgt?._count || afterTgt?.length || 0
    );

    // sample check catalog_clones
    const { data: clones } = await supabase
      .from('catalog_clones')
      .select('source_product_id, cloned_product_id')
      .eq('target_user_id', targetUserId)
      .limit(10);
    console.log('Sample catalog_clones (up to 10):', clones || []);

    console.log('Done');
  } catch (e) {
    console.error('Error running clone test', e);
    process.exit(1);
  }
}

main();
