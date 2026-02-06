#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const IDS = [
  '70e74da8-bc96-4565-b517-f48057842fb5',
  'e64e3604-d8f4-4564-99fe-db6e7fd6da52',
  '6ce39cdd-2751-4c7b-8606-2f08f4c6c2d8',
  'a9ccea9c-ffdf-4c08-8f2f-211698c924e0',
  'f74650b2-af25-42f1-9ac9-7ac9bf5c8fe3',
  '7a98653b-b14b-4904-afdb-869becd869d4',
  'ce440ef3-918c-4650-aa1a-da4a1da49ac7',
  'e9da05c1-3d5a-4be3-9d49-c2877c79d231',
  '3059f825-4832-48a4-b018-2718ffcabb79',
  '0374308c-6dcc-438e-9752-60695b5fb9df',
  '0225b873-80f6-4145-b649-b98395157501',
  'ac2f5b75-a39f-4b12-b3bc-185ea102027c',
  'ee65b08c-b6e6-45b9-bb2f-fd3ad0274f03',
  'f87544f5-3c26-409e-bf19-bd586a7e33f7',
  '9810a09b-69d4-471b-80d8-b13ba4a14ed0',
];

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  for (const id of IDS) {
    try {
      console.log('\nProcessing product', id);

      // 1) mark existing product_images for this product as pending (if not synced)
      const { data: imgs, error: imgsErr } = await supabase
        .from('product_images')
        .select('id,url,sync_status')
        .eq('product_id', id)
        .limit(100);

      if (imgsErr) {
        console.error(
          '  error fetching product_images',
          imgsErr.message || imgsErr
        );
      } else if (imgs && imgs.length > 0) {
        for (const img of imgs) {
          if (img.sync_status !== 'synced') {
            const { error: uErr } = await supabase
              .from('product_images')
              .update({ sync_status: 'pending' })
              .eq('id', img.id);
            if (uErr)
              console.error(
                '  failed to update image',
                img.id,
                uErr.message || uErr
              );
            else console.log('  marked product_image pending:', img.id);
          } else {
            console.log('  image already synced:', img.id);
          }
        }
      } else {
        console.log('  no product_images rows found');
      }

      // 2) ensure product has sync_status pending
      const { data: prod, error: pErr } = await supabase
        .from('products')
        .select('id,sync_status,image_url,images')
        .eq('id', id)
        .maybeSingle();
      if (pErr) {
        console.error('  error fetching product', pErr.message || pErr);
      } else if (prod) {
        if (prod.sync_status !== 'pending') {
          const { error: pu } = await supabase
            .from('products')
            .update({
              sync_status: 'pending',
              sync_error: 'Reenfileiramento manual',
            })
            .eq('id', id);
          if (pu)
            console.error('  failed to mark product pending', pu.message || pu);
          else console.log('  product marked pending');
        } else {
          console.log('  product already pending');
        }

        // If no product_images existed, create one from image_url or first images entry
        if ((!imgs || imgs.length === 0) && prod.image_url) {
          let url = null;
          if (typeof prod.image_url === 'string') url = prod.image_url;
          else if (prod.image_url && prod.image_url.url)
            url = prod.image_url.url;
          if (url) {
            const { error: insErr } = await supabase
              .from('product_images')
              .upsert(
                {
                  product_id: id,
                  url,
                  sync_status: 'pending',
                  created_at: new Date().toISOString(),
                },
                { onConflict: 'product_id,url' }
              );
            if (insErr)
              console.error(
                '  failed to upsert image from product.image_url',
                insErr.message || insErr
              );
            else
              console.log('  inserted product_images from product.image_url');
          }
        }
      } else {
        console.log('  product not found');
      }
    } catch (err) {
      console.error('  unexpected error for', id, err.message || err);
    }
  }
  console.log('\nDone.');
}

run().catch((e) => {
  console.error('Fatal', e);
  process.exit(1);
});
