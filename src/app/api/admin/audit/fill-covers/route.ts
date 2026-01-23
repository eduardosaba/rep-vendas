import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productIds } = body || {};
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds required' },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const results: Array<{ id: string; updated: boolean; reason?: string }> =
      [];

    for (const id of productIds) {
      try {
        const { data: p } = await supabase
          .from('products')
          .select('id, image_url, external_image_url, images')
          .eq('id', id)
          .limit(1)
          .maybeSingle();

        if (!p) {
          results.push({ id, updated: false, reason: 'not found' });
          continue;
        }

        const images = Array.isArray(p.images) ? p.images : [];
        // Prefer P00, else fallback to first image
        const chosen =
          images.find((u: string) => /p00/i.test(u)) ||
          images[0] ||
          p.external_image_url ||
          null;

        if (!chosen) {
          results.push({ id, updated: false, reason: 'no candidate' });
          continue;
        }

        // Update product image_url and set pending to be internalized
        const { error: updErr } = await supabase
          .from('products')
          .update({
            image_url: chosen,
            sync_status: 'pending',
            sync_error: null,
          })
          .eq('id', id);

        if (updErr) {
          results.push({ id, updated: false, reason: updErr.message });
          continue;
        }

        // Ensure product_images rows exist for gallery
        const gallery = images.map((url: string, idx: number) => ({
          product_id: id,
          url,
          position: idx,
          sync_status: url === chosen ? 'pending' : 'pending',
          created_at: new Date().toISOString(),
        }));

        if (gallery.length > 0) {
          await supabase
            .from('product_images')
            .upsert(gallery, { onConflict: 'product_id,url' });
        }

        results.push({ id, updated: true });
      } catch (e: any) {
        results.push({ id, updated: false, reason: String(e) });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
