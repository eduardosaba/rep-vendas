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

const ref = process.argv.slice(2).join(' ').trim();
if (!ref) {
  console.error('Usage: node scripts/find-product-by-ref.mjs "REFERENCE"');
  process.exit(1);
}

async function run() {
  // 1) try exact match
  const { data: exact, error: eErr } = await supabase
    .from('products')
    .select('id,reference_code,name')
    .eq('reference_code', ref)
    .limit(1)
    .maybeSingle();

  if (eErr) {
    console.error('Supabase error:', eErr.message || eErr);
    process.exit(2);
  }

  if (exact) {
    console.log(JSON.stringify({ found: true, id: exact.id, reference: exact.reference_code, name: exact.name }));
    process.exit(0);
  }

  // 2) try ilike (case-insensitive contains)
  const { data: list, error: lErr } = await supabase
    .from('products')
    .select('id,reference_code,name')
    .ilike('reference_code', `%${ref}%`)
    .limit(10);

  if (lErr) {
    console.error('Supabase error:', lErr.message || lErr);
    process.exit(2);
  }

  if (list && list.length > 0) {
    console.log(JSON.stringify({ found: true, candidates: list }));
    process.exit(0);
  }

  console.log(JSON.stringify({ found: false }));
  process.exit(0);
}

run().catch((err) => {
  console.error('Unexpected error:', err.message || err);
  process.exit(3);
});
