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

    // 1) fetch products for brand+status that have no image_url (null or empty)
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('id')
      .eq('brand', brand)
      .eq('sync_status', status)
      .or("image_url.is.null,image_url.eq.''");
    if (pErr) throw pErr;

    const prodIds = (prods || []).map((p: any) => p.id);
    if (prodIds.length === 0) return NextResponse.json({ orphan: 0 });

    // 2) find product_ids among them that have at least one synced product_images
    const { data: imgs, error: iErr } = await supabase
      .from('product_images')
      .select('product_id')
      .in('product_id', prodIds)
      .eq('sync_status', 'synced');
    if (iErr) throw iErr;

    const hasSynced = new Set((imgs || []).map((r: any) => r.product_id));
    const orphan = prodIds.filter((id) => !hasSynced.has(id)).length;

    return NextResponse.json({ orphan });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
