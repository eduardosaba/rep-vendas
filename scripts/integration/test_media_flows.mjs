#!/usr/bin/env node
/**
 * scripts/integration/test_media_flows.mjs
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 ACCESS_TOKEN=ey... node scripts/integration/test_media_flows.mjs
 *
 * Optional env:
 *   TEST_PATHS="userId/repair/example.jpg,userId/repair/another.jpg"
 *
 * This script will:
 * - POST /api/products/image-repair
 * - POST /api/admin/storage-cleanup (no body) => move detected orphans to /trash/
 * - If TEST_PATHS provided: POST with paths and then DELETE those paths in /trash/
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TEST_PATHS = process.env.TEST_PATHS
  ? process.env.TEST_PATHS.split(',')
  : [];

if (!ACCESS_TOKEN) {
  console.error('ERROR: set ACCESS_TOKEN env (JWT of an authenticated user)');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

const fetchWithTimeout = async (url, opts = {}, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    const text = await res.text().catch(() => '');
    return { raw: text, status: res.status };
  }
}

async function run() {
  console.log('BASE_URL=', BASE_URL);

  console.log('\n1) POST /api/products/image-repair');
  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/api/products/image-repair`,
      {
        method: 'POST',
        headers,
      },
      30000
    );
    const j = await safeJson(res);
    console.log('status=', res.status);
    console.log('body=', j);
  } catch (e) {
    console.error('error calling image-repair:', e.message || e);
  }

  console.log(
    '\n2) POST /api/admin/storage-cleanup (audit -> move to /trash/)'
  );
  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/api/admin/storage-cleanup`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      },
      30000
    );
    const j = await safeJson(res);
    console.log('status=', res.status);
    console.log('body=', j);
  } catch (e) {
    console.error('error calling storage-cleanup POST:', e.message || e);
  }

  if (TEST_PATHS.length > 0) {
    console.log(
      '\n3) POST /api/admin/storage-cleanup with explicit paths (move)'
    );
    try {
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/admin/storage-cleanup`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ paths: TEST_PATHS }),
        },
        30000
      );
      const j = await safeJson(res);
      console.log('status=', res.status);
      console.log('body=', j);
    } catch (e) {
      console.error(
        'error calling storage-cleanup POST with paths:',
        e.message || e
      );
    }

    console.log('\n4) DELETE /api/admin/storage-cleanup (permanent remove)');
    // convert to trash paths if needed
    const trashPaths = TEST_PATHS.map((p) => p.replace('/repair/', '/trash/'));
    try {
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/admin/storage-cleanup`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ paths: trashPaths }),
        },
        30000
      );
      const j = await safeJson(res);
      console.log('status=', res.status);
      console.log('body=', j);
    } catch (e) {
      console.error('error calling storage-cleanup DELETE:', e.message || e);
    }
  }

  console.log('\nFinished integration test script.');
}

run().catch((e) => {
  console.error('fatal error:', e);
  process.exit(1);
});
