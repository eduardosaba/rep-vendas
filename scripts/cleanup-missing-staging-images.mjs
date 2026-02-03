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
    : 'LIVE RUN: will delete missing staging_images'
);

async function existsInStorage(bucketName, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);
    if (error) return false;
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
      .from('staging_images')
      .select('id, user_id, storage_path, original_name, created_at')
      .not('storage_path', 'is', null)
      .range(offset, offset + batch - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching staging_images:', error.message || error);
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
        `MISSING: staging_images.id=${img.id} user=${img.user_id} path=${path} name=${img.original_name}`
      );

      if (dryRun) continue;

      try {
        const { error: delErr } = await supabase
          .from('staging_images')
          .delete()
          .eq('id', img.id);
        if (delErr) {
          console.warn(
            'Failed to delete staging_images',
            img.id,
            delErr.message || delErr
          );
        } else {
          console.log(`Deleted staging_images ${img.id}`);
        }
      } catch (e) {
        console.error('Error deleting staging image', img.id, e.message || e);
      }
    }

    offset += batch;
  }

  console.log('\nSummary:');
  console.log(
    `Total checked staging_images with storage_path: ${totalChecked}`
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
