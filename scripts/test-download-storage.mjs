import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const arg = process.argv[2];

  if (!SUPA || !KEY) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
    );
    process.exit(2);
  }
  if (!arg) {
    console.error(
      'Usage: node scripts/test-download-storage.mjs <path-inside-bucket>'
    );
    process.exit(2);
  }

  const bucket = process.argv[3] || 'product-images';
  const filePath = String(arg).replace(/^\/+/, '');

  const supabase = createClient(SUPA, KEY);

  console.log('Trying to download', { bucket, filePath, supabaseUrl: SUPA });
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    if (error) {
      console.error('download error:', error);
      process.exit(3);
    }
    if (!data) {
      console.error('No data returned from download');
      process.exit(4);
    }
    // read size
    const ab = await data.arrayBuffer();
    console.log('download ok, bytes:', ab.byteLength);
    process.exit(0);
  } catch (err) {
    console.error('unexpected error', err);
    process.exit(5);
  }
}

main();
