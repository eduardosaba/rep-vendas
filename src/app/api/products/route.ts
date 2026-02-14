import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies as nextCookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const brand = url.searchParams.get('brand');
    const sort = url.searchParams.get('sort');
    const sortKey = url.searchParams.get('sortKey');
    const sortDir = url.searchParams.get('sortDir');
    const userId = url.searchParams.get('userId');

    if (!userId)
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );

    const from = (Math.max(1, page) - 1) * limit;
    const to = from + limit - 1;
    const idsOnly = url.searchParams.get('idsOnly') === 'true';
    const imageOptimization = url.searchParams.get('imageOptimization');
    const idsParam = url.searchParams.get('ids');

    const supabase = await createRouteSupabase(() => nextCookies());

    let query: any = (supabase.from('products') as any).eq('user_id', userId);
    // Aplicar ordenação apenas se for uma chave permitida
    const allowedSortKeys = [
      'name',
      'reference_code',
      'sku',
      'barcode',
      'brand',
      'category',
      'price',
      'sale_price',
      'cost',
      'stock_quantity',
      'is_active',
      'is_launch',
      'is_best_seller',
      'id',
      'created_at',
    ];

    if (sortKey && sortDir && allowedSortKeys.includes(sortKey)) {
      query = query.order(sortKey, { ascending: sortDir === 'asc' });
    } else {
      // default order
      query = query.order('created_at', { ascending: false });
    }

    // Special-case: fetch by explicit ids list (comma-separated)
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0)
        return NextResponse.json({ data: [], meta: { totalCount: 0 } });
      query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .in('id', ids)
        .eq('user_id', userId);
    } else {
      // If caller requested only IDs (for select-all across pages), increase range
      // to cover large catalogs (admin scenarios) and reduce payload by selecting only `id`.
      if (!idsOnly) {
        query = query.select('*', { count: 'exact' }).range(from, to);
      } else {
        // Force a large range so "select all IDs" for admins returns the full set
        query = query.select('id', { count: 'exact' }).range(0, 20000);
      }
    }

    if (search) {
      const esc = search.replace(/%/g, '\\%');
      query = query.or(`name.ilike.%${esc}%,description.ilike.%${esc}%`);
    }

    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
    if (brand) query = query.eq('brand', brand);

    // legacy 'sort' param support (format: key.dir)
    if (!sortKey && sort) {
      const [key, dir] = sort.split('.');
      if (
        key &&
        (dir === 'asc' || dir === 'desc') &&
        allowedSortKeys.includes(key)
      ) {
        query = query.order(key, { ascending: dir === 'asc' });
      }
    }

    let data: any = null;
    let error: any = null;
    let count: number | null = null;
    try {
      const res: any = await query;
      data = res.data ?? res;
      // supabase-js returns .count when select was used with { count: 'exact' }
      count = res.count ?? null;

      // If Supabase returned an error object, throw to be handled below
      if (res.error) throw res.error;
    } catch (e: any) {
      console.error('[api/products] query failed', {
        message: e?.message,
        stack: e?.stack,
        params: {
          page,
          limit,
          search,
          minPrice,
          maxPrice,
          brand,
          sortKey,
          sortDir,
          idsParam,
          idsOnly,
          userId,
        },
      });
      // Map permission/rls errors to 403 for clarity
      const msg = e?.message || String(e);
      if (/permission|policy|rls|not authenticated|forbidden/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    let returned = data || [];
    // se solicitado, aplicar filtro de otimização de imagem no servidor (filtragem em JS)
    if (
      imageOptimization &&
      imageOptimization !== 'all' &&
      returned.length > 0
    ) {
      returned = (returned as any[]).filter((p) => {
        const hasStorageImage = Boolean(
          p.image_path ||
          (typeof p.image_url === 'string' &&
            p.image_url.includes('supabase.co/storage')) ||
          (typeof p.external_image_url === 'string' &&
            p.external_image_url.includes('supabase.co/storage')) ||
          (p.images &&
            Array.isArray(p.images) &&
            p.images.some((i: any) =>
              typeof i === 'string'
                ? i.includes('supabase.co/storage')
                : i && typeof i.url === 'string'
                  ? i.url.includes('supabase.co/storage')
                  : false
            ))
        );
        if (imageOptimization === 'optimized') return hasStorageImage;
        if (imageOptimization === 'unoptimized') return !hasStorageImage;
        return true;
      });
    }

    const meta = {
      totalCount: count || (returned ? returned.length : 0),
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1,
    };

    return NextResponse.json({ data: returned, meta });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
