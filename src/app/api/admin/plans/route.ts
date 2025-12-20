import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price');
    if (error) {
      console.error('[API /admin/plans GET] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API /admin/plans GET] Exception:', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[API /admin/plans POST] Body received:', body);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .insert(body)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API /admin/plans POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API /admin/plans POST] Success:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('[API /admin/plans POST] Exception:', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log('[API /admin/plans PUT] Body received:', body);

    const { id, ...rest } = body;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .update(rest)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API /admin/plans PUT] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API /admin/plans PUT] Success:', data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API /admin/plans PUT] Exception:', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
