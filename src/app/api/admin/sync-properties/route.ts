import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  syncDivergentProducts,
  normalizePropertyNames,
  cloneAndSyncCatalog,
} from '@/lib/clone/syncDivergentProducts';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId, sourceUserId, brands, properties, dryRun } = body;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        : supabase;

    // determine effective source user: allow override when caller is master/admin
    let effectiveSource = user.id;
    if (sourceUserId && String(sourceUserId) !== String(user.id)) {
      // check role of caller
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = profile?.role || null;
      if (role === 'master' || role === 'admin') {
        effectiveSource = sourceUserId;
      } else {
        return NextResponse.json({ error: 'Forbidden to act on behalf of other users' }, { status: 403 });
      }
    }

    const cleanedBrands = Array.isArray(brands) && brands.length > 0
      ? brands.map((b) => String(b || '').trim()).filter(Boolean)
      : null;

    // Support full clone / sync when properties === 'all'
    if (properties === 'all') {
      if (targetUserId) {
        const result = await cloneAndSyncCatalog({
          supabase: adminClient,
          sourceUserId: effectiveSource,
          targetUserId,
          brands: cleanedBrands,
          propertiesToSync: 'clone_safe',
          dryRun: Boolean(dryRun),
        });

        return NextResponse.json({
          success: true,
          updatedProducts: result.totalProcessed,
          updatedCount: result.totalProcessed,
          insertedCount: result.insertedCount,
          divergentCount: result.updatedCount,
          affectedUsers: 1,
          message: dryRun
            ? `Simulação: ${result.insertedCount} novos produtos a adicionar e ${result.updatedCount} existentes a atualizar.`
            : result.message,
        });
      }
    }

    // Default properties if not specified
    const rawProps = properties || [
      'price',
      'sale_price',
      'cost_price',
      'is_active',
      'is_launch',
      'is_best_seller',
      'stock_quantity',
      'description',
    ];

    // Se temos um targetUserId específico, usar syncDivergentProducts
    if (targetUserId) {
      const syncResult = await syncDivergentProducts({
        supabase: adminClient,
        sourceUserId: effectiveSource,
        targetUserId,
        brands: cleanedBrands,
        propertiesToSync: rawProps,
        dryRun: Boolean(dryRun),
      });

      if (dryRun) {
        return NextResponse.json({
          success: true,
          updatedCount: syncResult.divergentCount,
          affectedUsers: 1,
          message: `${syncResult.divergentCount} produtos com dados divergentes seriam atualizados`,
        });
      }

      return NextResponse.json({
        success: true,
        updatedProducts: syncResult.updatedCount,
        affectedUsers: 1,
        message: `${syncResult.updatedCount} produtos atualizados com sucesso`,
      });
    }

    // Fallback: se nenhum targetUserId for fornecido (sincronizar todos os clones do source)
    const normalizedPropsArray = normalizePropertyNames(rawProps);
    const propsToSync = Array.isArray(normalizedPropsArray) ? normalizedPropsArray : null;

    if (dryRun) {
      const { data: clones } = await adminClient
        .from('catalog_clones')
        .select('source_product_id, cloned_product_id, target_user_id')
        .eq('source_user_id', effectiveSource);

      let filtered = clones || [];
      if (cleanedBrands && cleanedBrands.length > 0) {
        const srcIds = Array.from(new Set(filtered.map((c: any) => c.source_product_id).filter(Boolean)));
        if (srcIds.length > 0) {
          const { data: srcProds } = await adminClient.from('products').select('id,brand').in('id', srcIds);
          const allowed = new Set((srcProds || []).filter((p: any) => cleanedBrands.includes(p.brand)).map((p: any) => String(p.id)));
          filtered = filtered.filter((c: any) => allowed.has(String(c.source_product_id)));
        } else {
          filtered = [];
        }
      }

      const updatedProducts = filtered.length;
      const affectedUsers = new Set((filtered || []).map((c: any) => String(c.target_user_id))).size;

      return NextResponse.json({
        success: true,
        updatedCount: updatedProducts,
        affectedUsers,
        message: `${updatedProducts} produtos seriam atualizados em ${affectedUsers} usuário(s)`,
      });
    }

    // Call SQL function to sync properties across all clones
    const { data, error } = await adminClient.rpc(
      'sync_product_properties_to_clones',
      {
        p_source_user_id: effectiveSource,
        p_target_user_id: null,
        p_brands: cleanedBrands,
        p_properties: propsToSync,
      }
    );

    if (error) throw error;

    const result = data?.[0] || { updated_products: 0, affected_users: 0 };

    return NextResponse.json({
      success: true,
      updatedProducts: result.updated_products,
      affectedUsers: result.affected_users,
      message: `${result.updated_products} produtos atualizados em ${result.affected_users} usuário(s)`,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar propriedades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar propriedades' },
      { status: 500 }
    );
  }
}
