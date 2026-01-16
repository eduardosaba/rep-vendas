#!/usr/bin/env node
// Simple env checker for RepVendas
// Usage: node scripts/check-env.js

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'IMPERSONATE_COOKIE_NAME',
  'INNGEST_API_KEY',
  'INNGEST_SIGNING_SECRET',
];

const missing = required.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.error('\n⚠️  Missing environment variables (required):\n');
  missing.forEach((m) => console.error(` - ${m}`));
  console.error('\nPlease add them to .env.local or your environment.');
  process.exit(1);
}

console.log('\n✅ All required environment variables are present.\n');

// Helpful warnings
if (
  process.env.NODE_ENV === 'production' &&
  process.env.COOKIE_SECURE !== 'true'
) {
  console.warn(
    '⚠️  COOKIE_SECURE is not true in production — ensure cookies are secure.'
  );
}

process.exit(0);
