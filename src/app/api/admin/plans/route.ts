import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      'Service role key not present, admin operations will be disabled'
    );
    return null;
  }
  return createClient(url, key);
}

export async function GET() {
  try {
    // Tenta usar service role, mas permite fallback para anon (SELECT público)
    let supabase = getSupabaseAdmin();
    if (!supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon)
        throw new Error('Supabase envs ausentes para leitura de planos');
      supabase = createClient(url, anon);
    }

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
    if (!supabase)
      return NextResponse.json(
        { error: 'Service role key missing' },
        { status: 500 }
      );
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
    if (!supabase)
      return NextResponse.json(
        { error: 'Service role key missing' },
        { status: 500 }
      );
    const { data, error } = await supabase
      .from('plans')
      .update(rest)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API /admin/plans PUT] Supabase error:', error);

      // Detect common Postgres trigger/schema mismatch where trigger tries
      // to set NEW.updated_at but the column doesn't exist.
      if (
        String(error.message || '').includes(
          'record "new" has no field "updated_at"'
        ) ||
        String(error.details || '').includes(
          'record "new" has no field "updated_at"'
        )
      ) {
        const guidance = `Erro de trigger: a tabela \"plans\" parece não ter a coluna \"updated_at\". Execute no Supabase SQL Editor:\n\nALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();\n\nE então reexecute a migração ENSURE_PLANS_AND_SUBSCRIPTIONS.sql para garantir gatilhos/policies.`;
        return NextResponse.json({ error: guidance }, { status: 500 });
      }

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
    if (!supabase)
      return NextResponse.json(
        { error: 'Service role key missing' },
        { status: 500 }
      );
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
