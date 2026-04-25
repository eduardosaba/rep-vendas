import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const query = "SELECT proname, proargnames::text FROM pg_proc WHERE proname = 'clone_catalog_smart';";

(async () => {
  try {
    const { data, error } = await supabase.rpc('sql', { query });
    if (error) {
      console.error('RPC error:', error);
      process.exit(2);
    }
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to run check:', e);
    process.exit(3);
  }
})();
