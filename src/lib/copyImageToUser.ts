import { createClient as createServiceClient } from '@supabase/supabase-js';
import path from 'path';

type CopyParams = {
  sourcePath: string; // caminho no bucket, ex: "masterUser/products/abc.jpg"
  targetUserId: string;
  productId: string;
  bucket?: string; // nome do bucket, default 'product-images'
  targetPath?: string; // se quiser controlar o destino
};

export async function copyImageToUser({
  sourcePath,
  targetUserId,
  productId,
  bucket = 'product-images',
  targetPath,
}: CopyParams) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase config');
  }

  const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize paths (remove leading slashes)
  const src = sourcePath.replace(/^\/+/, '');

  // Determine extension
  const ext = path.extname(src) || '.jpg';
  const destPath = targetPath || `${targetUserId}/products/${productId}${ext}`;

  // Download
  const { data: downloadData, error: dlError } = await supabase.storage
    .from(bucket)
    .download(src);
  if (dlError) throw dlError;

  // Convert stream/blob to Buffer
  // @ts-ignore - data may be Blob or ReadableStream depending on runtime
  const arrayBuffer = await downloadData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to new path
  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(destPath, buffer, { upsert: false });
  if (uploadErr) {
    // If file already exists, treat as non-fatal
    if (
      (uploadErr?.message || '').toLowerCase().includes('file already exists')
    ) {
      // fallthrough
    } else {
      throw uploadErr;
    }
  }

  // Get public url
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .getPublicUrl(destPath);
  const publicUrl = (urlData as any)?.publicUrl || '';

  // Update product record to point to user's copy
  const { error: updErr } = await supabase
    .from('products')
    .update({
      image_path: destPath,
      image_url: publicUrl,
      image_is_shared: false,
    })
    .eq('id', productId);
  if (updErr) throw updErr;

  return { destPath, publicUrl };
}
