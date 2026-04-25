import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260425_clone_catalog_batch_processor.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Migration file not found:', sqlPath);
  process.exit(2);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
  try {
    console.log('Applying migration from', sqlPath);
    const { data, error } = await supabase.rpc('sql', { query: sql });
    if (error) {
      console.error('RPC error applying migration:', error);
      process.exit(3);
    }
    console.log('Migration applied successfully. Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to apply migration:', e);
    process.exit(4);
  }
})();
