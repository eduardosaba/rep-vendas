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

    // Check if there's already a synced entry for this product+url
    const { data: existing } = await supabaseAdmin
      .from('product_images')
      .select('id, sync_status')
      .eq('product_id', productId)
      .eq('url', url)
      .limit(1)
      .maybeSingle();

    if (existing && existing.sync_status === 'synced') {
      return NextResponse.json({ success: true, alreadySynced: true });
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
