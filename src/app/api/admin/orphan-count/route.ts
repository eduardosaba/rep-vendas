import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brand = url.searchParams.get('brand');
    const status = url.searchParams.get('status');
    if (!brand || !status)
      return NextResponse.json(
        { error: 'brand and status required' },
        { status: 400 }
      );

    const supabase = await createClient();

    // 1) fetch products for brand+status (include image_url so we can filter in JS)
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('id,image_url')
      .eq('brand', brand)
      .eq('sync_status', status);
    if (pErr) {
      console.error('[orphan-count] products query error', { brand, status, error: pErr });
      throw pErr;
    }

    const prodsList = prods || [];
    // consider orphan candidates those with null/empty image_url
    const orphanCandidates = prodsList
      .filter((p: any) => !p.image_url || String(p.image_url).trim() === '')
      .map((p: any) => p.id);

    console.debug('[orphan-count] prodsTotal=', prodsList.length, 'orphanCandidates=', orphanCandidates.length);

    if (orphanCandidates.length === 0) return NextResponse.json({ orphan: 0 });

    // 2) find product_ids among candidates that have at least one synced product_images
    // Query product_images in batches to avoid very large `IN` arrays causing issues
    const hasSynced = new Set<string | number>();
    try {
      const BATCH = 800;
      for (let i = 0; i < orphanCandidates.length; i += BATCH) {
        const chunk = orphanCandidates.slice(i, i + BATCH);
        const { data: imgsChunk, error: iErr } = await supabase
          .from('product_images')
          .select('product_id')
          .in('product_id', chunk)
          .eq('sync_status', 'synced');
        if (iErr) {
          console.error('[orphan-count] product_images chunk error', { brand, status, chunkLength: chunk.length, error: iErr });
          throw iErr;
        }
        (imgsChunk || []).forEach((r: any) => hasSynced.add(r.product_id));
      }
    } catch (e) {
      console.error('[orphan-count] error while fetching product_images', e);
      throw e;
    }
    const orphan = orphanCandidates.filter((id) => !hasSynced.has(id)).length;

    return NextResponse.json({ orphan });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
