#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import process from 'process';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON = process.env.CRON_SECRET || 'dev_cron_secret_change_me';

async function run() {
  console.log('Checking pending...');
  const cp = await fetch(`${APP_URL}/api/admin/check-pending`);
  if (!cp.ok) {
    console.error('check-pending failed', cp.status, await cp.text());
    process.exit(1);
  }
  const j = await cp.json();
  console.log('Pending count:', j.count);
  if (j.count && j.count > 0) {
    console.log('Triggering sync-images...');
    const r = await fetch(`${APP_URL}/api/admin/sync-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON}` },
    });
    console.log('sync-images status:', r.status);
    const txt = await r.text();
    console.log('sync-images body:', txt.slice(0, 200));
    process.exit(r.ok ? 0 : 2);
  } else {
    console.log('Nothing pending.');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('error', e);
  process.exit(1);
});
