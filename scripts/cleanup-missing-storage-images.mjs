import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing Supabase credentials in env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');
const bucketArgIndex = args.findIndex((a) => a === '--bucket');
const bucket =
  bucketArgIndex >= 0
    ? args[bucketArgIndex + 1]
    : process.env.PRODUCT_IMAGES_BUCKET ||
      process.env.STORAGE_BUCKET ||
      'product-images';
const limitArgIndex = args.findIndex((a) => a === '--limit');
const limit = limitArgIndex >= 0 ? Number(args[limitArgIndex + 1]) : 500;

console.log(`Using bucket: ${bucket}`);
console.log(
  dryRun
    ? 'DRY RUN: no deletions will be performed'
    : 'LIVE RUN: will delete missing product_images and update products'
);

async function existsInStorage(bucketName, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);
    if (error) {
      // supabase returns a 400/404-like error when file not found
      return false;
    }
    return !!data;
  } catch (e) {
    return false;
  }
}

async function main() {
  let offset = 0;
  let totalChecked = 0;
  let totalMissing = 0;
  const batch = limit || 500;

  while (true) {
    const { data: imgs, error } = await supabase
      .from('product_images')
      .select('id, product_id, url, optimized_url, storage_path, is_primary')
      .not('storage_path', 'is', null)
      .range(offset, offset + batch - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching product_images:', error.message || error);
      break;
    }
    if (!imgs || imgs.length === 0) break;

    for (const img of imgs) {
      totalChecked++;
      const path = String(img.storage_path || '').trim();
      if (!path) continue;
      const present = await existsInStorage(bucket, path);
      if (present) continue;

      totalMissing++;
      console.log(
        `MISSING: product_images.id=${img.id} product_id=${img.product_id} path=${path}`
      );

      if (dryRun) continue;

      try {
        // 1) delete product_images row
        const { error: delErr } = await supabase
          .from('product_images')
          .delete()
          .eq('id', img.id);
        if (delErr) {
          console.warn(
            'Failed to delete product_images',
            img.id,
            delErr.message || delErr
          );
        } else {
          console.log(`Deleted product_images ${img.id}`);
        }

        // 2) clean product.images array and product.image_url/image_path if pointing to this path
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select(
            'id, images, image_url, image_path, external_image_url, sync_status'
          )
          .eq('id', img.product_id)
          .maybeSingle();

        if (prodErr) {
          console.warn(
            'Failed to fetch product',
            img.product_id,
            prodErr.message || prodErr
          );
          continue;
        }
        if (!prod) continue;

        let needsUpdate = false;
        const newImages = (prod.images || []).filter((it) => {
          const s = String(it || '');
          return s !== img.url && s !== img.optimized_url && s !== path;
        });
        if (JSON.stringify(newImages) !== JSON.stringify(prod.images || []))
          needsUpdate = true;

        let newImageUrl = prod.image_url;
        let newImagePath = prod.image_path;
        let newSyncStatus = prod.sync_status;

        if (prod.image_path === path || prod.image_path === img.storage_path) {
          newImagePath = null;
          // fallback to external_image_url if exists, otherwise null and mark pending
          newImageUrl = prod.external_image_url || null;
          newSyncStatus = prod.external_image_url ? 'pending' : 'pending';
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error: updErr } = await supabase
            .from('products')
            .update({
              images: newImages.length > 0 ? newImages : null,
              image_url: newImageUrl,
              image_path: newImagePath,
              sync_status: newSyncStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', prod.id);

          if (updErr)
            console.warn(
              'Failed to update product',
              prod.id,
              updErr.message || updErr
            );
          else console.log(`Updated product ${prod.id} (cleaned references)`);
        }
      } catch (e) {
        console.error('Error processing missing image', img.id, e.message || e);
      }
    }

    offset += batch;
  }

  console.log('\nSummary:');
  console.log(
    `Total checked product_images with storage_path: ${totalChecked}`
  );
  console.log(
    `Total missing (removed or would be removed in dry-run): ${totalMissing}`
  );
  if (dryRun)
    console.log(
      'Dry run complete. Re-run without --dry-run to perform deletions.'
    );
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
