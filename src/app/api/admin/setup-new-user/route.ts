import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type Body = {
  sourceUserId?: string;
  targetUserId: string;
  brands: string[];
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();

    const cleanedBrands = Array.isArray(body?.brands)
      ? body.brands
          .map((b) => String(b || '').trim())
          .filter((b) => b.length > 0)
      : [];

    if (!body?.targetUserId || cleanedBrands.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!UUID_REGEX.test(body.targetUserId)) {
      return NextResponse.json(
        { error: 'targetUserId inválido' },
        { status: 400 }
      );
    }

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

    // Validate caller token and role
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token === 'undefined' || token === 'null')
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: userResp, error: userErr } = await supabase.auth.getUser(
      token as any
    );
    const user = userResp?.user;
    if (!user)
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call RPC to clone catalog by brand (Postgres function must exist)
    const sourceId = body.sourceUserId || user.id;

    if (!UUID_REGEX.test(sourceId)) {
      return NextResponse.json(
        { error: 'sourceUserId inválido' },
        { status: 400 }
      );
    }

    if (sourceId === body.targetUserId) {
      return NextResponse.json(
        { error: 'Origem e destino devem ser usuários diferentes' },
        { status: 400 }
      );
    }

    // Optional: ensure source exists
    const { data: srcUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sourceId)
      .maybeSingle();
    if (!srcUser) {
      return NextResponse.json(
        { error: 'Source user not found' },
        { status: 400 }
      );
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id,company_id')
      .eq('id', body.targetUserId)
      .maybeSingle();
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 400 }
      );
    }

    // Call the RPC. Function signature from migration: clone_catalog_smart(source_user_id uuid, target_user_id uuid, brands_to_copy text[])
    console.log('[setup-new-user] Calling clone_catalog_smart with:', {
      source_user_id: sourceId,
      target_user_id: body.targetUserId,
      brands_to_copy: cleanedBrands,
    });

    const { data, error } = await supabase.rpc('clone_catalog_smart', {
      source_user_id: sourceId,
      target_user_id: body.targetUserId,
      brands_to_copy: cleanedBrands,
    });

    if (error) {
      console.error('[setup-new-user] RPC clone_catalog_smart failed:', error);
      return NextResponse.json(
        {
          error: 'Falha ao executar clone_catalog_smart. Verifique se a migration foi aplicada no banco de dados.',
          detail: error.message || String(error),
          hint: 'Execute: SELECT proname, proargnames FROM pg_proc WHERE proname = \'clone_catalog_smart\'; para verificar a função.',
        },
        { status: 500 }
      );
    }

    // Company-aware normalization: when target user belongs to a company,
    // move cloned products to company scope while keeping user_id (schema requires NOT NULL).
    let normalizedToCompany = 0;
    const targetCompanyId = (targetUser as any)?.company_id
      ? String((targetUser as any).company_id)
      : null;

    if (targetCompanyId) {
      const { data: sourceProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', sourceId)
        .in('brand', cleanedBrands as any[]);

      const sourceIds = (sourceProducts || [])
        .map((p: any) => p.id)
        .filter(Boolean);

      if (sourceIds.length > 0) {
        const { data: mappings } = await supabase
          .from('catalog_clones')
          .select('cloned_product_id')
          .eq('target_user_id', body.targetUserId)
          .eq('source_user_id', sourceId)
          .in('source_product_id', sourceIds as any[]);

        const clonedIds = (mappings || [])
          .map((m: any) => m.cloned_product_id)
          .filter(Boolean);

        if (clonedIds.length > 0) {
          const { data: normalizedRows, error: normalizeErr } = await supabase
            .from('products')
            .update({ company_id: targetCompanyId, user_id: body.targetUserId } as any)
            .in('id', clonedIds as any[])
            .select('id,user_id');

          if (normalizeErr) {
            throw new Error(`Falha ao normalizar clone para company_id: ${normalizeErr.message}`);
          }

          normalizedToCompany = Array.isArray(normalizedRows)
            ? normalizedRows.length
            : 0;

          // Pós-condição crítica: clone corporativo precisa manter user_id preenchido (NOT NULL).
          const leakedCount = Array.isArray(normalizedRows)
            ? normalizedRows.filter((r: any) => !r?.user_id).length
            : 0;

          if (leakedCount > 0) {
            throw new Error(
              `Normalização incompleta: ${leakedCount} produto(s) corporativos ficaram sem user_id.`
            );
          }
        }

        // Fallback robusto: garante promoção mesmo quando catalog_clones estiver incompleto.
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('products')
          .update({ company_id: targetCompanyId, user_id: body.targetUserId } as any)
          .eq('user_id', body.targetUserId)
          .in('brand', cleanedBrands as any[])
          .select('id,user_id');

        if (fallbackErr) {
          throw new Error(`Falha no fallback de normalização para company_id: ${fallbackErr.message}`);
        }

        normalizedToCompany += Array.isArray(fallbackRows) ? fallbackRows.length : 0;

        const { count: leakedAfterFallback, error: leakedErr } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', targetCompanyId)
          .is('user_id', null)
          .in('brand', cleanedBrands as any[]);

        if (leakedErr) {
          throw new Error(`Falha ao validar pós-condição do fallback: ${leakedErr.message}`);
        }

        if (Number(leakedAfterFallback || 0) > 0) {
          throw new Error(
            `Normalização falhou após fallback: ${leakedAfterFallback} produto(s) ficaram sem user_id.`
          );
        }
      }
    }

    try {
      const cookieStore = await cookies();
      const impersonateCookieName =
        process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';
      const impersonatedId =
        cookieStore.get(impersonateCookieName)?.value || null;
      await supabase.from('activity_logs').insert({
        user_id: impersonatedId || user.id,
        impersonator_id: impersonatedId ? user.id : null,
        action_type: 'CLONE',
        description: `Clonagem executada: ${body.brands.join(', ')} de ${sourceId} para ${body.targetUserId}`,
        metadata: {
          source_user_id: sourceId,
          target_user_id: body.targetUserId,
          brands: cleanedBrands,
          result: data,
        },
      });
    } catch (logErr) {
      console.warn('Failed to write activity log for setup-new-user', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Clonagem concluída com sucesso',
      data,
      normalizedToCompany,
    });
  } catch (err: any) {
    console.error('setup-new-user error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
