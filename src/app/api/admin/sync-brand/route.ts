import { NextResponse } from 'next/server';
import createRouteSupabase from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { clonarCatalogo } from '@/lib/clone/clonarCatalogo';

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    if (!profile || profile.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { brandName, sourceUserId } = body || {};
    if (!brandName)
      return NextResponse.json(
        { error: 'brandName required' },
        { status: 400 }
      );

    // sourceUserId optional: default to admin caller
    const masterUserId = sourceUserId || user.id;

    // Service role client for heavy writes
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey)
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 }
      );

    const svc = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceKey,
      {
        auth: { persistSession: false },
      }
    );

    // 1) Identificar representantes que já possuem essa marca (exclui mestre)
    const { data: targetUsers, error: usersError } = await svc
      .from('products')
      .select('user_id')
      .eq('brand', brandName)
      .neq('user_id', masterUserId);

    if (usersError) throw usersError;

    const uniqueUserIds = Array.from(
      new Set((targetUsers || []).map((u: any) => u.user_id))
    );

    // 2) Para cada target, executar clonarCatalogo (idempotente)
    const details: any[] = [];
    for (const targetId of uniqueUserIds) {
      try {
        const res = await clonarCatalogo(
          svc,
          masterUserId,
          targetId,
          brandName
        );
        details.push({ user_id: targetId, success: true, count: res.count });
      } catch (err: any) {
        details.push({
          user_id: targetId,
          success: false,
          message: err?.message || String(err),
        });
      }
    }

    return NextResponse.json({
      message: `Sincronização da marca ${brandName} concluída`,
      reps_affected: uniqueUserIds.length,
      details,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
