import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

// This route removes all logs for a given popup_id. Intended for admin use.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const popupId = body?.popupId || body?.popup_id;
    if (!popupId) return NextResponse.json({ success: false, error: 'popupId required' }, { status: 400 });

    // Simple admin protection: require a secret header matching env var
    const adminSecret = process.env.POPUP_ADMIN_SECRET;
    const headerSecret = req.headers.get('x-admin-secret');
    if (!adminSecret || headerSecret !== adminSecret) {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    const supabase = await createRouteSupabase();
    const { error } = await supabase.from('popup_logs').delete().eq('popup_id', popupId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('popup reset error', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
