import { createClient as createServiceClient } from '@supabase/supabase-js';
import path from 'path';

type CopyBrandParams = {
  sourcePath: string; // caminho no bucket, ex: "masterUser/brands/logo.jpeg"
  targetUserId: string;
  brandId: string;
  asset: 'logo' | 'banner';
  bucket?: string;
  targetPath?: string;
};

export async function copyBrandImageToUser({
  sourcePath,
  targetUserId,
  brandId,
  asset,
  bucket = 'product-images',
  targetPath,
}: CopyBrandParams) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase config');
  }

  const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const src = sourcePath.replace(/^\/+/, '');
  const ext = path.extname(src) || '.jpg';
  const destPath =
    targetPath || `${targetUserId}/brands/${asset}/${brandId}${ext}`;

  // download
  const { data: downloadData, error: dlError } = await supabase.storage
    .from(bucket)
    .download(src);
  if (dlError) throw dlError;

  // convert to buffer
  // @ts-ignore
  const arrayBuffer = await downloadData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(destPath, buffer, { upsert: false });
  if (uploadErr) {
    if (
      (uploadErr?.message || '').toLowerCase().includes('file already exists')
    ) {
      // ignore
    } else {
      throw uploadErr;
    }
  }

  const { data: urlData } = await supabase.storage
    .from(bucket)
    .getPublicUrl(destPath);
  const publicUrl = (urlData as any)?.publicUrl || '';

  // update brands row
  const updatePayload: any = {};
  if (asset === 'logo') updatePayload.logo_url = publicUrl;
  else updatePayload.banner_url = publicUrl;

  const { error: updErr } = await supabase
    .from('brands')
    .update(updatePayload)
    .eq('id', brandId)
    .eq('user_id', targetUserId);
  if (updErr) throw updErr;

  return { destPath, publicUrl };
}
