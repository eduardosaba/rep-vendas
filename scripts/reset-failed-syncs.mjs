import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function resetFailedItems() {
  console.log('🔄 Resetting failed sync items to pending...');

  // Reset product_images
  const { error: piError, count: piCount } = await supabase
    .from('product_images')
    .update({ sync_status: 'pending', sync_error: null })
    .eq('sync_status', 'failed')
    .select('*', { count: 'exact', head: true });

  if (piError) {
    console.error('❌ Error resetting product_images:', piError);
  } else {
    console.log(`✅ Reset ${piCount || 0} failed items in product_images.`);
  }

  // Also check if there is a 'sync_job_items' table (mentioned in prompt)
  // But based on codebase exploration, we used 'product_images' or 'products'.
  // We'll check 'products' table too for any sync_status

  // Note: The prompt mentions `sync_job_items`, but our code uses `product_images` with sync_status.
  // I will assume the prompt's SQL was a suggestion and I should map it to the actual schema `product_images` or `sync_job_items` if it exists.
  // I'll check if sync_job_items exists first.

  const { error: tableCheck } = await supabase
    .from('sync_job_items')
    .select('id')
    .limit(1);
  if (!tableCheck) {
    console.log('Found sync_job_items table, resetting there too...');
    const { error: sjiError, count: sjiCount } = await supabase
      .from('sync_job_items')
      .update({ status: 'pending', error_message: null })
      .eq('status', 'failed')
      .select('*', { count: 'exact', head: true });
    if (sjiError) console.error('❌ Error resetting sync_job_items:', sjiError);
    else console.log(`✅ Reset ${sjiCount || 0} items in sync_job_items.`);
  } else {
    // Expected if table doesn't exist or RLS blocks (but we are service role)
    // Based on previous files, we mostly saw `product_images` table.
    // Let's assume the user meant product_images or potentially `products.sync_status`.
  }
}

resetFailedItems();
