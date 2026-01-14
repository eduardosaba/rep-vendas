#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env'
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log(
      'Usage: node scripts/test-copy-on-write.mjs <sourcePath> <targetUserId> <productId> [bucket]'
    );
    process.exit(1);
  }

  const [sourcePath, targetUserId, productId, bucket = 'product-images'] = args;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const src = sourcePath.replace(/^\/+/, '');
    const ext = path.extname(src) || '.jpg';
    const destPath = `${targetUserId}/products/${productId}${ext}`;

    console.log('Downloading', src);
    const { data: downloadData, error: dlError } = await supabase.storage
      .from(bucket)
      .download(src);
    if (dlError) throw dlError;

    const arrayBuffer = await downloadData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Uploading to', destPath);
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(destPath, buffer, { upsert: false });
    if (uploadErr) {
      if (
        !String(uploadErr.message || '')
          .toLowerCase()
          .includes('file already exists')
      )
        throw uploadErr;
      console.log('File already exists at destination; continuing');
    }

    const { data: urlData } = await supabase.storage
      .from(bucket)
      .getPublicUrl(destPath);
    const publicUrl = (urlData || {}).publicUrl || '';

    console.log('Updating product record', productId);
    const { error: updErr } = await supabase
      .from('products')
      .update({
        image_path: destPath,
        image_url: publicUrl,
        image_is_shared: false,
      })
      .eq('id', productId);
    if (updErr) throw updErr;

    console.log('Copy-on-write test complete. publicUrl=', publicUrl);
  } catch (e) {
    console.error('Error running test-copy-on-write', e);
    process.exit(1);
  }
}

main();
