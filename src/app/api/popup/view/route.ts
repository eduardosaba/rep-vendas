import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const popupId = body?.popupId || body?.popup_id;
    if (!popupId) return NextResponse.json({ success: false, error: 'popupId required' }, { status: 400 });

    const supabase = await createRouteSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = (userData || {}).user;
    if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 });

    // Update only the viewed_at field to preserve created_at (delivery) and
    // avoid overwriting existing timestamps. Only set viewed_at if it's null
    // so we keep the first view time.
    const { error } = await supabase
      .from('popup_logs')
      .update({ viewed_at: new Date().toISOString() })
      .match({ popup_id: popupId, user_id: user.id })
      .is('viewed_at', null);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('popup view error', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
