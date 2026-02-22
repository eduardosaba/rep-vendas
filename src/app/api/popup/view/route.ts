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

    const { error } = await supabase
      .from('popup_logs')
      .upsert(
        {
          popup_id: popupId,
          user_id: user.id,
          user_email: user.email || null,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'popup_id,user_id' }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('popup view error', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
