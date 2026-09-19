import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function run() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if(error) {
    console.error(error);
  } else if(data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    // If empty, fetch a single row with 0 limit to still get keys from Supabase JS? Supabase JS doesn't return schema easily if empty without pg_meta.
    console.log('Table empty, trying to insert a dummy or maybe check schema...');
  }
}
run();
