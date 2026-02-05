import { createClient as createServerClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, url } = body || {};
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    if (!productId || !url) {
      return NextResponse.json(
        { error: 'Missing productId or url' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServerClient(supabaseUrl, serviceKey);

    // Fetch product_images for this product and try to match by url, optimized_url or storage_path
    const { data: imagesForProduct, error: fetchErr } = await supabaseAdmin
      .from('product_images')
      .select('id, url, optimized_url, storage_path, sync_status')
      .eq('product_id', productId)
      .limit(100);

    if (fetchErr) {
      console.error('[mark-image-pending] fetch error', fetchErr);
      return NextResponse.json(
        { success: false, error: fetchErr.message },
        { status: 500 }
      );
    }

    const found = (imagesForProduct || []).find((r: any) => {
      if (!r) return false;
      const candidates = [r.url, r.optimized_url, r.storage_path]
        .filter(Boolean)
        .map(String);
      return candidates.includes(String(url));
    });

    // If there's already a synced image matching this url (by any of the known fields), avoid reenfileirar
    if (found && found.sync_status === 'synced') {
      return NextResponse.json({ success: true, alreadySynced: true });
    }

    // If we found a matching row (but not yet synced), ensure it's marked pending and don't insert duplicate
    if (found) {
      try {
        if (found.sync_status !== 'pending') {
          await supabaseAdmin
            .from('product_images')
            .update({ sync_status: 'pending' })
            .eq('id', found.id);
        }
      } catch (e) {
        console.warn('[mark-image-pending] ensure pending failed', e);
      }

      // Also mark product as pending to prioritize
      await supabaseAdmin
        .from('products')
        .update({ sync_status: 'pending' })
        .eq('id', productId);

      return NextResponse.json({ success: true, alreadyExists: true });
    }

    // Insert product_images row if not exists
    const { error: insertError } = await supabaseAdmin
      .from('product_images')
      .upsert(
        {
          product_id: productId,
          url,
          is_primary: false,
          sync_status: 'pending',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,url' }
      );

    if (insertError) {
      console.error('[mark-image-pending] insert error', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Also mark product as pending so workers can prioritize it
    await supabaseAdmin
      .from('products')
      .update({ sync_status: 'pending' })
      .eq('id', productId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[mark-image-pending] unexpected', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
