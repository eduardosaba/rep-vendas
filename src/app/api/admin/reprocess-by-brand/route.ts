import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brand, status } = body || {};

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update matching products: set to pending so sync workers pick them up
    const updateBody: any = { sync_status: 'pending', sync_error: null };
    if (status === 'failed') {
      updateBody.sync_error = 'Reprocessamento manual solicitado';
    }

    let query = supabase
      .from('products')
      .update(updateBody)
      .eq('sync_status', status);
    if (brand == null) {
      query = query.is('brand', null);
    } else {
      query = query.eq('brand', brand);
    }

    const { count, error } = await query;
    if (error) {
      console.error('[reprocess-by-brand] update error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      message: `Reprocessamento solicitado para ${count || 0} produtos.`,
    });
  } catch (err: any) {
    console.error('[reprocess-by-brand] unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
