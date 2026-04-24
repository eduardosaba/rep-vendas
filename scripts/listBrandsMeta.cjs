#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPA || !SERVICE) {
  console.error('Supabase credentials not found in env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPA, SERVICE);
const userId = process.argv[2] || null;

(async () => {
  try {
    let q = supabase.from('brands').select('id, name, user_id, logo_url, banner_url').order('name', { ascending: true });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) {
      console.error('Supabase query error:', error.message || error);
      process.exit(2);
    }
    if (!data || data.length === 0) {
      console.log('No brands found');
      return;
    }
    // Print compact table-like output
    for (const row of data) {
      console.log(`ID: ${row.id} | user_id: ${row.user_id || '-'} | name: ${row.name}`);
      console.log(`  logo_url: ${JSON.stringify(row.logo_url)}`);
      console.log(`  banner_url: ${JSON.stringify(row.banner_url)}`);
      console.log('---');
    }
  } catch (e) {
    console.error('Unexpected error:', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
