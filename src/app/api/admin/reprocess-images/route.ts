import { createClient as createServerClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const supabaseAdmin = createServerClient(supabaseUrl, serviceKey);

    // Optional: could inspect caller via cookies/headers, but this endpoint
    // must be protected by network/role. We'll still allow invocation only
    // from server-admins by checking an incoming secret header (optional).
    // For now, perform the update and return counts.

    // Count failed items first
    const countRes = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('sync_status', 'failed');

    const failedCount = (countRes as any).count || 0;

    // Update failed -> pending
    const { error } = await supabaseAdmin
      .from('products')
      .update({ sync_status: 'pending', sync_error: null })
      .eq('sync_status', 'failed');

    if (error) {
      console.error('[reprocess-images] update error', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reset: failedCount });
  } catch (err: any) {
    console.error('[reprocess-images] unexpected', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
