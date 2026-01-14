import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Body = {
  target_user_id: string;
  brands: string[];
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Valida payload
    if (!body?.target_user_id || !Array.isArray(body.brands)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verifica se o solicitante é master/admin (espera-se token JWT no Authorization)
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token)
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    // Verifica role do solicitante via RPC user profile
    const { data: profileData, error: profileErr } =
      await supabase.auth.getUser(token as any);
    const user = (profileData as any)?.user || null;
    if (!user)
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });

    // Buscar role
    const { data: p } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = p?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cria um registro simples na tabela de jobs para o worker processar.
    const jobPayload = {
      type: 'clone_catalog',
      payload: {
        source_user_id: user.id,
        target_user_id: body.target_user_id,
        brands: body.brands,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase
      .from('sync_jobs')
      .insert(jobPayload);
    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true, message: 'Clone job queued' });
  } catch (err: any) {
    console.error('clone-catalog error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
