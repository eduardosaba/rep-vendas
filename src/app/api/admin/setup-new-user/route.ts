import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { syncDivergentProducts } from '@/lib/clone/syncDivergentProducts';

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

    let user: any = null;
    if (token && token !== 'undefined' && token !== 'null') {
      const { data: userResp } = await supabase.auth.getUser(token as any);
      user = userResp?.user;
    } else {
      const { getServerUserFallback } = await import('@/lib/supabase/getServerUserFallback');
      user = await getServerUserFallback();
    }

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
        let batchCall = await supabase.rpc('clone_catalog_batch', {
          p_source_user_id: sourceId,
          p_target_user_id: body.targetUserId,
          p_brands_to_copy: brandsToSend,
          p_batch_size: batchSize,
          p_last_id: lastId,
        } as any);

        if (batchCall.error && /not find.*function/i.test(batchCall.error.message || '')) {
          batchCall = await supabase.rpc('clone_catalog_batch', {
            source_user_id: sourceId,
            target_user_id: body.targetUserId,
            brands_to_copy: brandsToSend,
            batch_size: batchSize,
            last_id: lastId,
          } as any);
        }

        if (batchCall.error) throw batchCall.error;

        const row: any = Array.isArray(batchCall.data) && batchCall.data.length > 0 ? batchCall.data[0] : batchCall.data;
        const processed = Number(row?.processed_count || 0);
        const last = row?.last_processed_id || null;

        totalProcessed += processed;
        lastId = last || lastId;

        if (!processed || processed === 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      // Sincronizar produtos com referências já existentes que tenham informações divergentes
      // Atualiza apenas campos permitidos: price, sale_price, is_launch, sku, barcode (ean), is_active (status), description
      const syncResult = await syncDivergentProducts({
        supabase,
        sourceUserId: sourceId,
        targetUserId: body.targetUserId,
        brands: brandsToSend,
        propertiesToSync: 'clone_safe',
        dryRun: false,
      });

      // Guarantee target user's cloned products have organization_id populated
      await ensureTargetProductsOrganizationId(supabase, body.targetUserId);

      const msgParts = [];
      if (totalProcessed > 0) msgParts.push(`${totalProcessed} novos produtos adicionados`);
      if (syncResult.updatedCount > 0) msgParts.push(`${syncResult.updatedCount} produtos existentes atualizados`);
      const message = msgParts.length > 0
        ? `Sincronização concluída: ${msgParts.join(' e ')}.`
        : 'Catálogo já está sincronizado com o master.';

      return NextResponse.json({
        success: true,
        message,
        data: {
          total_processed: totalProcessed + syncResult.updatedCount,
          inserted_count: totalProcessed,
          updated_count: syncResult.updatedCount,
        },
      });
    } catch (batchErr) {
      console.warn('clone_catalog_batch failed, falling back to clone_catalog_smart', batchErr);
    }

    // Fallback: try clone_catalog_smart without mixing parameter signatures
    let legacyData: any = null;
    let legacyErr: any = null;

    const call1 = await supabase.rpc('clone_catalog_smart', {
      source_user_id: sourceId,
      target_user_id: body.targetUserId,
      brands_to_copy: brandsToSend,
    } as any);

    if (!call1.error) {
      legacyData = call1.data;
    } else {
      const call2 = await supabase.rpc('clone_catalog_smart', {
        p_source_user_id: sourceId,
        p_target_user_id: body.targetUserId,
        p_brands_to_copy: brandsToSend,
      } as any);

      if (!call2.error) {
        legacyData = call2.data;
      } else {
        legacyErr = call2.error;
      }
    }

    if (legacyErr) {
      console.error('clone_catalog_smart failed', legacyErr);
      return NextResponse.json({ error: 'RPC failed', detail: legacyErr.message || String(legacyErr) }, { status: 500 });
    }

    // Sincronizar produtos existentes que tenham informações divergentes
    // Atualiza apenas campos permitidos: price, sale_price, is_launch, sku, barcode (ean), is_active (status), description
    const fallbackSyncResult = await syncDivergentProducts({
      supabase,
      sourceUserId: sourceId,
      targetUserId: body.targetUserId,
      brands: brandsToSend,
      propertiesToSync: 'clone_safe',
      dryRun: false,
    });

    await ensureTargetProductsOrganizationId(supabase, body.targetUserId);

    const insertedCount = typeof legacyData === 'number' ? legacyData : (legacyData?.total_processed ?? 0);
    const msgParts = [];
    if (insertedCount > 0) msgParts.push(`${insertedCount} novos produtos adicionados`);
    if (fallbackSyncResult.updatedCount > 0) msgParts.push(`${fallbackSyncResult.updatedCount} produtos existentes atualizados`);
    const message = msgParts.length > 0
      ? `Sincronização concluída: ${msgParts.join(' e ')}.`
      : 'Catálogo já está sincronizado com o master.';

    return NextResponse.json({
      success: true,
      message,
      data: {
        total_processed: insertedCount + fallbackSyncResult.updatedCount,
        inserted_count: insertedCount,
        updated_count: fallbackSyncResult.updatedCount,
      },
    });
  } catch (err: any) {
    console.error('[setup-new-user] error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

async function ensureTargetProductsOrganizationId(supabase: any, targetUserId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, company_id')
      .eq('id', targetUserId)
      .maybeSingle();

    let targetOrgId = profile?.organization_id || null;
    let targetCompId = profile?.company_id || null;

    if (!targetOrgId) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();
      if (member?.organization_id) {
        targetOrgId = member.organization_id;
      }
    }

    if (targetOrgId) {
      await supabase
        .from('products')
        .update({
          organization_id: targetOrgId,
          ...(targetCompId ? { company_id: targetCompId } : {}),
        })
        .eq('user_id', targetUserId)
        .is('organization_id', null);
    }
  } catch (err) {
    console.warn('[setup-new-user] Failed to backfill organization_id on cloned products:', err);
  }
}
