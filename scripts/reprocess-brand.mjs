#!/usr/bin/env node
import fetch from 'node-fetch';

const [, , brandArg, statusArg] = process.argv;
const brand = brandArg;
const status = statusArg || 'failed';

function exitWith(msg, code = 0) {
  console.log(msg);
  process.exit(code);
}

async function reprocessWithSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error('SUPABASE vars missing for direct DB update');

  const supabase = createClient(url, key);

  const updateBody = {
    sync_status: 'pending',
    sync_error:
      status === 'failed' ? 'Reprocessamento manual solicitado' : null,
  };

  let query = supabase.from('products').update(updateBody);
  query = query.eq('sync_status', status);

  if (brand == null) {
    query = query.is('brand', null);
  } else {
    query = query.eq('brand', brand);
  }

  // request returning rows to calculate count
  const { data, count, error } = await query.select('id', { count: 'exact' });
  if (error) throw error;
  const affected =
    typeof count === 'number' ? count : Array.isArray(data) ? data.length : 0;
  exitWith(`Sucesso: ${affected} produtos marcaram como pending.`);
}

async function reprocessWithApi() {
  const dev = process.env.DEV_URL || 'http://localhost:3000';
  const url = `${dev.replace(/\/$/, '')}/api/admin/reprocess-by-brand`;
  const payload = { status };
  if (brand != null) payload.brand = brand;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  exitWith(`API: ${json.message || JSON.stringify(json)}`);
}

(async () => {
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await reprocessWithSupabase();
    } else {
      await reprocessWithApi();
    }
  } catch (err) {
    console.error('Falha ao solicitar reprocessamento:', err.message || err);
    process.exit(1);
  }
})();
