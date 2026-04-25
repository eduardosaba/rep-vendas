import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Default properties if not specified
    const propsToSync = properties || [
      'price',
      'sale_price',
      'is_active',
      'is_launch',
      'is_best_seller',
      'description',
    ];

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

    // Support full clone when properties === 'all'
    if (properties === 'all') {
      // dry-run: count how many products would be cloned from the source for the brands
      if (dryRun) {
        const q = supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', effectiveSource);
        if (brands && Array.isArray(brands) && brands.length > 0) q.in('brand', brands);
        const { count, error: cErr } = await q;
        if (cErr) throw cErr;
        return NextResponse.json({ success: true, updatedCount: typeof count === 'number' ? count : 0 });
      }

      // execute full clone via RPC
      const rpcParams: any = {
        source_user_id: effectiveSource,
        target_user_id: targetUserId,
        brands_to_copy: brands || null,
        p_brands_to_copy: brands || null,
        p_source_user_id: effectiveSource,
        p_target_user_id: targetUserId,
      };
      const { data: rpcData, error: rpcErr } = await supabase.rpc('clone_catalog_smart', rpcParams);

      if (rpcErr) throw rpcErr;
      return NextResponse.json({ success: true, updatedCount: rpcData });
    }

    if (dryRun) {
      // Compute affected clones without applying changes
      // 1) fetch catalog_clones for this source user (and optional target filter)
      const { data: clones, error: clonesErr } = await supabase
        .from('catalog_clones')
        .select('source_product_id, cloned_product_id, target_user_id')
        .eq('source_user_id', effectiveSource);

      // Note: .maybeSingle above returns single row when using maybeSingle; but we want array
      // Adjust: redo select without maybeSingle
      let filtered = clones || [];

      if (targetUserId) {
        filtered = filtered.filter((c: any) => String(c.target_user_id) === String(targetUserId));
      }

      // If brands filter present, fetch source products and filter by brand
      if (brands && Array.isArray(brands) && brands.length > 0) {
        const srcIds = Array.from(new Set(filtered.map((c: any) => c.source_product_id).filter(Boolean)));
        if (srcIds.length > 0) {
          const { data: srcProds } = await supabase.from('products').select('id,brand').in('id', srcIds);
          const allowed = new Set((srcProds || []).filter((p: any) => brands.includes(p.brand)).map((p: any) => String(p.id)));
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

    // Call SQL function to sync properties (apply)
    const { data, error } = await supabase.rpc(
      'sync_product_properties_to_clones',
      {
        p_source_user_id: effectiveSource,
        p_target_user_id: targetUserId || null,
        p_brands: brands || null,
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
