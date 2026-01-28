#!/usr/bin/env node
/**
 * scripts/integration/get_access_token.mjs
 *
 * Usage:
 *   SUPABASE_URL=https://<project>.supabase.co SUPABASE_ANON_KEY=anonkey EMAIL=you@example.com PASSWORD=yourpass \
 *     node scripts/integration/get_access_token.mjs
 *
 * Output: prints a JSON with session and access_token. Use ACCESS_TOKEN from output to run integration tests.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in env');
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error('Missing EMAIL or PASSWORD in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

(async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (error) {
      console.error('Auth error:', error.message || error);
      process.exit(1);
    }
    const session = data.session;
    if (!session) {
      console.error('No session returned from Supabase auth');
      process.exit(1);
    }

    console.log(
      JSON.stringify(
        {
          access_token: session.access_token,
          expires_at: session.expires_at,
          user: session.user,
        },
        null,
        2
      )
    );
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
