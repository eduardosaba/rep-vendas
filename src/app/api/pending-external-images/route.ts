import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    // Support legacy imports: some older imports stored image URLs in `image_url`.
    // We coalesce so that either `external_image_url` or `image_url` will be
    // considered a pending external image (until migration copies values).
    // Additionally include products that have entries in `product_images`
    // with sync_status != 'synced' (these represent gallery images still
    // awaiting optimization) so the diagnostic panel reflects them.

    const { data: directData, error: directErr } = await supabase
      .from('products')
      .select('id, name, reference_code, external_image_url, image_url')
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .order('id', { ascending: true });

    if (directErr) {
      console.error('Erro ao buscar pendentes (direct):', directErr);
      return NextResponse.json({ error: directErr.message }, { status: 500 });
    }

    // Find product IDs that have pending/failed product_images
    const { data: imgs, error: imgsErr } = await supabase
      .from('product_images')
      .select('product_id')
      .neq('sync_status', 'synced');

    if (imgsErr) {
      console.error('Erro ao buscar product_images pendentes:', imgsErr);
      // proceed with directData only
    }

    const productIdsFromImages = Array.from(
      new Set((imgs || []).map((r: any) => r.product_id).filter(Boolean))
    );

    let imgsProducts: any[] = [];
    if (productIdsFromImages.length > 0) {
      const { data: pFromImgs, error: pFromImgsErr } = await supabase
        .from('products')
        .select('id, name, reference_code, external_image_url, image_url')
        .in('id', productIdsFromImages)
        .order('id', { ascending: true });

      if (pFromImgsErr) {
        console.error(
          'Erro ao buscar produtos a partir de product_images:',
          pFromImgsErr
        );
      } else {
        imgsProducts = pFromImgs || [];
      }
    }

    // Merge and dedupe by id
    const mergedMap = new Map<string, any>();
    (directData || []).forEach((row: any) => mergedMap.set(row.id, row));
    imgsProducts.forEach((row: any) => mergedMap.set(row.id, row));

    const merged = Array.from(mergedMap.values());

    const normalized = merged.map((row: any) => ({
      id: row.id,
      name: row.name,
      reference_code: row.reference_code,
      external_image_url: row.external_image_url || row.image_url || null,
    }));

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error('Erro no endpoint pending-external-images:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
