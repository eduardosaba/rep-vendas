#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ALLOW_INSECURE =
  process.env.ALLOW_INSECURE_TLS === '1' ||
  process.env.ALLOW_INSECURE_TLS === 'true';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env (.env.local).'
  );
  process.exit(1);
}

if (ALLOW_INSECURE) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'ALLOW_INSECURE_TLS active — insecure TLS bypass is disabled in source.\nTo run with insecure TLS for local testing, start the process with NODE_TLS_REJECT_UNAUTHORIZED=0 in your shell. Do NOT enable this in production.'
    );
  } else {
    console.warn('ALLOW_INSECURE_TLS is set but will not be applied in production');
  }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const SAFILO_IMAGE =
  process.argv[2] ||
  'https://commportal-images.safilo.com/10/09/81/100981000300_P00.JPG';
const CLEANUP = process.env.E2E_CLEANUP !== 'false';

async function pickUser() {
  const envUser = process.env.TEST_USER_ID || null;
  if (envUser) return envUser;
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  if (error) throw error;
  if (!profiles || profiles.length === 0)
    throw new Error('No profiles found; set TEST_USER_ID in .env.local');
  return profiles[0].id;
}

async function createProduct(userId) {
  const payload = {
    user_id: userId,
    name: `E2E Internalize Test ${Date.now()}`,
    reference_code: `E2E-${Date.now()}`,
    brand: 'Safilo E2E',
    price: 0,
    images: [SAFILO_IMAGE],
    external_image_url: SAFILO_IMAGE,
    image_url: null,
    image_path: null,
    sync_status: 'pending',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data.id || (Array.isArray(data) ? data[0].id : null);
}

async function callSyncEndpoint(productId) {
  const url = `${APP_URL.replace(/\/$/, '')}/api/admin/sync-images?product_id=${productId}&force=1`;
  console.log('Calling sync endpoint:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(120000),
  });
  const json = await res.json();
  console.log('Sync endpoint response:', JSON.stringify(json));
  return json;
}

async function waitForSync(productId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase
      .from('products')
      .select('sync_status,image_path,image_url,sync_error')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Product row disappeared');
    console.log(
      'Status poll:',
      data.sync_status,
      data.image_path || data.sync_error || ''
    );
    if (data.sync_status === 'synced') return data;
    if (data.sync_status === 'failed')
      throw new Error('Sync failed: ' + (data.sync_error || 'unknown'));
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Timeout waiting for sync');
}

async function verifyPublicUrl(imagePath) {
  const publicUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/product-images/${imagePath}`;
  console.log('Checking public URL:', publicUrl);
  const res = await fetch(publicUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10000),
  });
  return res.status === 200;
}

async function cleanup(productId, imagePath) {
  try {
    if (imagePath) {
      console.log('Removing storage object:', imagePath);
      await supabase.storage.from('product-images').remove([imagePath]);
    }
    console.log('Deleting product row:', productId);
    await supabase.from('products').delete().eq('id', productId);
  } catch (e) {
    console.warn('Cleanup warning:', e.message || e);
  }
}

async function main() {
  try {
    const userId = await pickUser();
    console.log('Using user:', userId);
    const productId = await createProduct(userId);
    console.log('Created product id:', productId);
    await callSyncEndpoint(productId);
    const result = await waitForSync(productId, 120000);
    console.log('Final product row:', result);
    if (!result.image_path) throw new Error('No image_path set after sync');
    const ok = await verifyPublicUrl(result.image_path);
    if (!ok) throw new Error('Public URL not reachable');
    console.log('E2E Internalize test: SUCCESS ✅');
    if (CLEANUP) await cleanup(productId, result.image_path);
    process.exit(0);
  } catch (err) {
    console.error('E2E Internalize test: FAILED ❌', err.message || err);
    process.exit(2);
  }
}

main();
