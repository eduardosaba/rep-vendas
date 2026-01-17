import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || '10');

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Faz join server-side para evitar queries REST aninhadas quebrando por falta de FK/perm.
    // Nota: RPC raw SQL placeholder removido — usamos query builder abaixo como fallback.

    // Fallback: consulta via query builder usando relacionamento explícito
    const { data: rows, error: qErr } = await supabase
      .from('user_status')
      .select('user_id, is_online, last_seen, users!inner(email)')
      .order('last_seen', { ascending: false })
      .limit(limit);

    if (qErr) {
      // Se a seleção por relacionamento falhar, tenta RAW JOIN via SQL
      const rawSql = `SELECT us.user_id, us.is_online, us.last_seen, u.email FROM public.user_status us LEFT JOIN public.users u ON u.id = us.user_id ORDER BY us.last_seen DESC LIMIT ${limit}`;
      const { data: raw, error: rawErr } = await supabase.rpc('run_sql', {
        p_sql: rawSql,
      } as any);
      if (rawErr) {
        console.error('user-status query error', qErr, rawErr);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
      }
      return NextResponse.json({ data: raw });
    }

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('user-status route error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
