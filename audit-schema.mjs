import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const tables = ['clients', 'products', 'orders', 'profiles', 'organizations'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (data) {
      console.log('--- TABLE: ' + table + ' ---');
      if (data.length > 0) {
        console.log(Object.keys(data[0]).join(', '));
      } else {
        console.log('Empty table, but exists. We cannot infer columns from empty query without RPC.');
      }
    } else {
       console.log('TABLE: ' + table + ' - ERROR: ' + error.message);
    }
  }

  // Also check if any commercial tables exist yet
  const newTables = ['price_tables', 'price_table_items', 'commercial_policies'];
  for (const table of newTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
       console.log('TABLE: ' + table + ' - Does not exist (' + error.message + ')');
    } else {
       console.log('TABLE: ' + table + ' - EXISTS');
    }
  }
}
run();
