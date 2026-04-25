import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Body = {
  sourceUserId?: string;
  targetUserId: string;
  brands?: string[] | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cleanedBrands = Array.isArray(body?.brands)
      ? body.brands.map((b) => String(b || '').trim()).filter(Boolean)
      : [];

    let brandsToSend: string[] | null = cleanedBrands.length > 0 ? cleanedBrands : null;
    try {
      const looksLikeUuid = cleanedBrands.length > 0 && cleanedBrands.every((b) => UUID_REGEX.test(b));
      if (looksLikeUuid) {
        const { data: brandRows } = await supabase.from('brands').select('name').in('id', cleanedBrands as any[]);
        if (Array.isArray(brandRows) && brandRows.length > 0) {
          const names = brandRows.map((r: any) => String(r.name || '').trim()).filter(Boolean);
          if (names.length > 0) brandsToSend = names;
        }
      }
    } catch (mapErr) {
      console.warn('Failed to map brand ids to names', mapErr);
      brandsToSend = cleanedBrands.length > 0 ? cleanedBrands : null;
    }

    if (!body?.targetUserId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!UUID_REGEX.test(body.targetUserId)) {
      return NextResponse.json({ error: 'targetUserId inválido' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token === 'undefined' || token === 'null')
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: userResp } = await supabase.auth.getUser(token as any);
    const user = userResp?.user;
    if (!user) return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = profile?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sourceId = body.sourceUserId || user.id;
    if (!UUID_REGEX.test(sourceId)) {
      return NextResponse.json({ error: 'sourceUserId inválido' }, { status: 400 });
    }

    if (sourceId === body.targetUserId) {
      return NextResponse.json({ error: 'Origem e destino devem ser usuários diferentes' }, { status: 400 });
    }

    // Try batch RPC first
    try {
      let totalProcessed = 0;
      let lastId: string | null = null;
      const batchSize = 500;

      while (true) {
        const { data: batchRes, error: batchErr }: { data: any; error: any } = await supabase.rpc('clone_catalog_batch', {
          p_source_user_id: sourceId,
          p_target_user_id: body.targetUserId,
          p_brands_to_copy: brandsToSend,
          p_batch_size: batchSize,
          p_last_id: lastId,
        } as any);

        if (batchErr) throw batchErr;

        const row: any = Array.isArray(batchRes) && batchRes.length > 0 ? batchRes[0] : batchRes;
        const processed = Number(row?.processed_count || 0);
        const last = row?.last_processed_id || null;

        totalProcessed += processed;
        lastId = last || lastId;

        if (!processed || processed === 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      return NextResponse.json({ success: true, data: { total_processed: totalProcessed } });
    } catch (batchErr) {
      console.warn('clone_catalog_batch failed, falling back to clone_catalog_smart', batchErr);
    }

    // Fallback
    const rpcParams: any = {
      source_user_id: sourceId,
      target_user_id: body.targetUserId,
      brands_to_copy: brandsToSend,
      p_brands_to_copy: brandsToSend,
      p_source_user_id: sourceId,
      p_target_user_id: body.targetUserId,
    };

    const { data: legacyData, error: legacyErr } = await supabase.rpc('clone_catalog_smart', rpcParams);
    if (legacyErr) {
      console.error('clone_catalog_smart failed', legacyErr);
      return NextResponse.json({ error: 'RPC failed', detail: legacyErr.message || String(legacyErr) }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: legacyData });
  } catch (err: any) {
    console.error('[setup-new-user] error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
