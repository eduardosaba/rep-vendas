import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createRouteSupabase();

    const payload: any = {
      url: body.url || null,
      error_type: body.error_type || null,
      message: body.message || null,
      user_agent: body.user_agent || null,
      stack_trace: body.stack_trace || null,
      user_id: body.user_id || null,
    };

    const { error } = await supabase.from('error_logs').insert([payload]);
    if (error) {
      console.error('error-logs insert error', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('error-logs exception', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
