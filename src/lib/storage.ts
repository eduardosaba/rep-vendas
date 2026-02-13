import type { SupabaseClient } from '@supabase/supabase-js';

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

export const uploadImage = async (
  supabase: SupabaseClient,
  file: File,
  bucket: string,
  userId: string,
  customFileName: string | null = null
): Promise<UploadResult> => {
  if (!supabase) {
    throw new Error(
      'uploadImage requires a Supabase client instance as first argument'
    );
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = customFileName || `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${bucket}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: data.publicUrl,
      filePath: filePath,
    };
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

export const deleteImage = async (
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): Promise<DeleteResult> => {
  // Backwards-compatible wrapper that uses the safe deletion helper
  return await deleteImageIfUnused(supabase, bucket, filePath);
};

export const deleteImageIfUnused = async (
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): Promise<DeleteResult> => {
  if (!supabase) {
    throw new Error(
      'deleteImageIfUnused requires a Supabase client instance as first argument'
    );
  }

  try {
    // Normalize the path fragment to search for in URL/text fields
    const cleanPath = filePath.replace(/\\/g, '/');

    // Try a single SQL count via RPC wrapper if available (best-effort)
    const countQuery = `
      SELECT (
        (SELECT COALESCE(SUM(1),0) FROM products WHERE image_path = $1)
        + (SELECT COALESCE(SUM(1),0) FROM products WHERE image_url ILIKE '%' || $1 || '%')
        + (SELECT COALESCE(SUM(1),0) FROM products WHERE images::text ILIKE '%' || $1 || '%')
        + (SELECT COALESCE(SUM(1),0) FROM product_images WHERE url ILIKE '%' || $1 || '%')
        + (SELECT COALESCE(SUM(1),0) FROM product_images WHERE storage_path = $1)
      ) AS total_refs
    `;

    // Use the public SQL RPC if present (`sql` wrapper used in some deployments).
    let totalRefs = 0;
    try {
      // @ts-ignore - using generic RPC for raw SQL if available on instance
      const { data: countRes, error: countErr } = await supabase.rpc('sql', {
        query: countQuery,
        params: [cleanPath],
      } as any);

      if (!countErr && Array.isArray(countRes) && countRes.length > 0) {
        totalRefs = Number((countRes[0] as any).total_refs || 0);
      }
    } catch (rpcErr) {
      // ignore and fallback to JS-side checks
    }

    if (totalRefs === 0) {
      // JS-side fallback (safer but potentially slower)
      const [pByPath, pByUrl, pByImages, piByUrl, piByStorage] =
        await Promise.all([
          supabase
            .from('products')
            .select('id', { count: 'exact' })
            .eq('image_path', filePath),
          supabase
            .from('products')
            .select('id', { count: 'exact' })
            .ilike('image_url', `%${cleanPath}%`),
          supabase
            .from('products')
            .select('id', { count: 'exact' })
            .filter('images', 'is', null),
          supabase
            .from('product_images')
            .select('id', { count: 'exact' })
            .ilike('url', `%${cleanPath}%`),
          supabase
            .from('product_images')
            .select('id', { count: 'exact' })
            .eq('storage_path', filePath),
        ]).catch(() => [null, null, null, null, null]);

      const c1 = (pByPath && (pByPath.count as number)) || 0;
      const c2 = (pByUrl && (pByUrl.count as number)) || 0;
      const c3 = (pByImages && (pByImages.count as number)) || 0;
      const ci1 = (piByUrl && (piByUrl.count as number)) || 0;
      const ci2 = (piByStorage && (piByStorage.count as number)) || 0;
      totalRefs = c1 + c2 + c3 + ci1 + ci2;
    }

    if (totalRefs > 0) {
      return {
        success: false,
        error: `imagem em uso por ${totalRefs} referência(s)`,
      };
    }

    // Safe to remove
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar imagem (seguro):', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getImageUrl = (
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): string => {
  if (!supabase) {
    throw new Error(
      'getImageUrl requires a Supabase client instance as first argument'
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
};
