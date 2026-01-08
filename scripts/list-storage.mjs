#!/usr/bin/env node
import process from 'process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  );
  process.exit(1);
}

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? true];
  })
);
const BUCKET = argv.bucket || 'product-images';
const PREFIX = argv.prefix || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function listAll(prefix = '') {
  const pageSize = 1000;
  let from = 0;
  const items = [];
  while (true) {
    const res = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: pageSize, offset: from });
    if (res.error) {
      console.error('List error', res.error);
      process.exit(1);
    }
    const data = res.data || [];
    for (const it of data) {
      items.push(it);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return items;
}

(async function main() {
  console.log('Listing bucket', BUCKET, 'prefix', PREFIX);
  try {
    const items = await listAll(PREFIX);
    console.log('Total items:', items.length);
    items.forEach((it, i) => {
      console.log(
        `${i + 1}. name=${it.name} id=${it.id || ''} metadata=${JSON.stringify(it.metadata || {})}`
      );
    });
  } catch (e) {
    console.error('Error listing', e);
  }
})();
