import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload: any = {
      user_id: user.id,
      name: String(body.name || '').trim(),
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).replace(/\D/g, '') : null,
      address: body.address ? String(body.address).trim() : null,
    };

    const { data, error } = await supabase.from('clients').insert(payload).select().maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, client: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
