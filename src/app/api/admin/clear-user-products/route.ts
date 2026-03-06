import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // auth check with request cookies
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // only admin/master allowed
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'master'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // accept JSON or form-encoded bodies
    let userId: string | null = null;
    let brands: string[] | null = null;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await req.json();
      userId = body.userId || null;
      brands = body.brands || null;
    } else {
      const body = await req.formData();
      userId = (body.get('userId') as string) || null;
      const b = body.get('brands') as string | null;
      if (b) {
        try { brands = JSON.parse(b); } catch { brands = null; }
      }
    }

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // use service role to bypass RLS for delete
    const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // determine products to delete
    let toDeleteIds: string[] = [];
    // sanitize brands input
    if (brands && Array.isArray(brands) && brands.length > 0) {
      const cleanBrands = brands.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean);
      // If multiple brands were provided, delete per-brand sequentially to avoid potential .in limitations
      for (const br of cleanBrands) {
        const { data: rows, error: qErr } = await service
          .from('products')
          .select('id')
          .eq('user_id', userId)
          .eq('brand', br);
        if (qErr) {
          console.warn('clear-user-products: error querying brand', br, qErr.message || qErr);
          continue;
        }
        const ids = (rows || []).map((r: any) => r.id).filter(Boolean);
        toDeleteIds.push(...ids);
      }
      // de-duplicate ids
      toDeleteIds = Array.from(new Set(toDeleteIds));
    } else {
      // delete all for user
      const { data: rows, error: qErr } = await service
        .from('products')
        .select('id')
        .eq('user_id', userId);
      if (qErr) throw qErr;
      toDeleteIds = (rows || []).map((r: any) => r.id).filter(Boolean);
    }

    if (toDeleteIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'Nenhum produto para remover' });
    }

    // delete products by id and return deleted rows for verification
    const { data: deletedRows, error: delErr } = await service
      .from('products')
      .delete()
      .select('id')
      .in('id', toDeleteIds)
      .eq('user_id', userId);
    if (delErr) throw delErr;

    const deletedCount = Array.isArray(deletedRows) ? deletedRows.length : 0;

    if (deletedCount !== toDeleteIds.length) {
      console.warn(`clear-user-products: expected to delete ${toDeleteIds.length} but deleted ${deletedCount}`);
    }

    // remove catalog_clones mappings pointing to these cloned product ids
    const { data: deletedMaps, error: mapErr } = await service
      .from('catalog_clones')
      .delete()
      .select('cloned_product_id')
      .in('cloned_product_id', toDeleteIds)
      .eq('target_user_id', userId);
    if (mapErr) console.warn('failed to remove catalog_clones mappings', mapErr.message);

    const removedMapsCount = Array.isArray(deletedMaps) ? deletedMaps.length : 0;

    return NextResponse.json({ success: true, deleted: deletedCount, removed_mappings: removedMapsCount });
  } catch (err: any) {
    console.error('clear-user-products error', err);
    return NextResponse.json({ error: err.message || 'Erro' }, { status: 500 });
  }
}
