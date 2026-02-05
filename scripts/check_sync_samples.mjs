import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE credentials');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  try {
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select(
        'id, reference_code, image_url, image_path, images, gallery_images, updated_at'
      )
      .eq('sync_status', 'synced')
      .order('updated_at', { ascending: false })
      .limit(3);
    if (pErr) throw pErr;
    if (!prods || prods.length === 0) {
      console.log('No synced products found');
      return;
    }

    for (const pr of prods) {
      const { data: imgs, error: iErr } = await supabase
        .from('product_images')
        .select(
          'id, url, optimized_url, storage_path, optimized_variants, sync_status, is_primary, position'
        )
        .eq('product_id', pr.id)
        .order('position', { ascending: true });
      if (iErr) throw iErr;

      console.log('\n=== PRODUCT ===');
      console.log(`id: ${pr.id}`);
      console.log(`ref: ${pr.reference_code}  updated_at: ${pr.updated_at}`);
      console.log('images field:', JSON.stringify(pr.images || null, null, 2));
      console.log(
        'gallery_images field:',
        JSON.stringify(pr.gallery_images || null, null, 2)
      );
      console.log('product_images rows:');
      console.log(JSON.stringify(imgs || [], null, 2));
    }
  } catch (e) {
    console.error('Error querying supabase:', e.message || e);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
