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
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    if (!userId)
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );

    const from = (Math.max(1, page) - 1) * limit;
    const to = from + limit - 1;
    const idsOnly = url.searchParams.get('idsOnly') === 'true';
    const imageOptimization = url.searchParams.get('imageOptimization');
    const onlyLaunch = url.searchParams.get('onlyLaunch') === 'true';
    const onlyFeatured = url.searchParams.get('onlyFeatured') === 'true';
    const onlyBestSeller = url.searchParams.get('onlyBestSeller') === 'true';
    const idsParam = url.searchParams.get('ids');
    const aggregateOnly = url.searchParams.get('aggregate') === 'true';

    const supabase = await createRouteSupabase(() => nextCookies());

    if (!supabase || typeof supabase.from !== 'function') {
      console.error('[api/products] supabase client invalid', { supabase });
      return NextResponse.json(
        { error: 'Supabase client unavailable' },
        { status: 500 }
      );
    }

      // Detect available boolean column names by sampling one product row.
      // This lets us adapt to tenant schemas that migrated column names.
      let sampleCols = new Set<string>();
      try {
        const { data: sampleRow } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (sampleRow && typeof sampleRow === 'object') {
          Object.keys(sampleRow).forEach((k) => sampleCols.add(k));
        }
      } catch (e) {
        // ignore sampling errors; fallback logic will handle missing columns
      }

      const pickCol = (cands: string[]) => {
        for (const c of cands) if (sampleCols.has(c)) return c;
        return null;
      };

      const activeCol = pickCol(['is_active', 'active']);
      const launchCol = pickCol(['is_launch', 'launch', 'isNew', 'is_new']);
      const featuredCol = pickCol(['is_destaque', 'destaque', 'is_featured', 'featured']);
      const bestCol = pickCol(['is_best_seller', 'bestseller', 'is_bestseller', 'best_seller']);

    // Comece sempre com um `select` antes de encadear filtros (compatibilidade com Postgrest)
    // Por padrão, só retornamos produtos ativos. Admins podem enviar includeInactive=true.
    let query: any = supabase.from('products').select('*', { count: 'exact' }).eq('user_id', userId);
    if (!includeInactive && activeCol) query = query.eq(activeCol, true);
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

    // If caller only requested aggregates, compute and return them
    if (aggregateOnly) {
      try {
        // Total (respeita active/is_active por padrão) - usa coluna detectada
        let totalQ: any = supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('user_id', userId);
        if (!includeInactive && activeCol) totalQ = totalQ.eq(activeCol, true);
        const { data: _totalData, count: totalCount } = await totalQ;

        // Launch and best-seller counts (usa colunas detectadas quando disponíveis)
        let launchQ: any = supabase.from('products').select('id', { count: 'exact' }).eq('user_id', userId);
        if (launchCol) launchQ = launchQ.eq(launchCol, true);
        let bestQ: any = supabase.from('products').select('id', { count: 'exact' }).eq('user_id', userId);
        if (bestCol) bestQ = bestQ.eq(bestCol, true);
        let featuredQ: any = supabase.from('products').select('id', { count: 'exact' }).eq('user_id', userId);
        if (featuredCol) featuredQ = featuredQ.eq(featuredCol, true);
        if (!includeInactive && activeCol) {
          launchQ = launchQ.eq(activeCol, true);
          bestQ = bestQ.eq(activeCol, true);
          featuredQ = featuredQ.eq(activeCol, true);
        }
        const { data: launchData, count: launchCount } = await launchQ;
        const { data: bestData, count: bestCount } = await bestQ;
        const { data: featuredData, count: featuredCount } = await featuredQ;

        // Brands (only active by default)
        let brandsQ: any = supabase.from('products').select('brand').eq('user_id', userId);
        if (!includeInactive && activeCol) brandsQ = brandsQ.eq(activeCol, true);
        const { data: brandsData } = await brandsQ;

        const brandsCount = new Set(
          (brandsData || []).map((r: any) => r.brand).filter(Boolean)
        ).size;

        return NextResponse.json({
          aggregate: {
            total: totalCount ?? (brandsData?.length || 0),
            brands: brandsCount,
            launch: launchCount ?? 0,
            featured: featuredCount ?? 0,
            best: bestCount ?? 0,
          },
        });
      } catch (e: any) {
        console.error('[api/products] aggregate failed', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
      }
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
      if (!includeInactive && activeCol) query = query.eq(activeCol, true);
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

    // Server-side filters for boolean flags (support legacy variants)
    // Apply server-side boolean filters using the default column names first.
    // We avoid building complex `.or()` strings at this stage because PostgREST
    // may surface missing-column errors only at execution time. If execution
    // fails due to a missing column, we retry without these boolean filters
    // and apply them in JS as a fallback (safer for mixed tenant schemas).
    if (onlyLaunch && launchCol) {
      query = query.eq(launchCol, true);
    }
    if (onlyFeatured && featuredCol) {
      query = query.eq(featuredCol, true);
    }
    if (onlyBestSeller && bestCol) {
      query = query.eq(bestCol, true);
    }

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
    const error: any = null;
    let count: number | null = null;
    try {
      const res: any = await query;
      data = res.data ?? res;
      // supabase-js returns .count when select was used with { count: 'exact' }
      count = res.count ?? null;

      // If Supabase returned an error object, throw to be handled below
      if (res.error) throw res.error;
    } catch (e: any) {
      // If error is about a missing column and boolean filters were requested,
      // retry a safer flow: re-run query WITHOUT the problematic boolean filters
      // and apply those filters in JS. This avoids 500s for tenants with
      // different column names.
      const msg = e?.message || String(e);
      console.error('[api/products] query failed', { message: msg });

      const isMissingCol = /column .* does not exist|Could not find the '([\w_]+)' column/i.test(msg);
      if (isMissingCol && (onlyLaunch || onlyFeatured || onlyBestSeller)) {
        try {
          // Rebuild a query without boolean filters
          let safeQ: any;
          if (idsParam) {
            const ids = idsParam
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            safeQ = supabase
              .from('products')
              .select('*', { count: 'exact' })
              .in('id', ids)
              .eq('user_id', userId);
            if (!includeInactive && activeCol) safeQ = safeQ.eq(activeCol, true);
          } else {
            if (!idsOnly) {
              safeQ = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .range(from, to);
              if (!includeInactive && activeCol) safeQ = safeQ.eq(activeCol, true);
            } else {
              safeQ = supabase
                .from('products')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .range(0, 20000);
              if (!includeInactive && activeCol) safeQ = safeQ.eq(activeCol, true);
            }
          }

          if (search) {
            const esc = search.replace(/%/g, '\\%');
            safeQ = safeQ.or(`name.ilike.%${esc}%,description.ilike.%${esc}%`);
          }
          if (minPrice) safeQ = safeQ.gte('price', parseFloat(minPrice));
          if (maxPrice) safeQ = safeQ.lte('price', parseFloat(maxPrice));
          if (brand) safeQ = safeQ.eq('brand', brand);
          if (sortKey && sortDir && allowedSortKeys.includes(sortKey)) {
            safeQ = safeQ.order(sortKey, { ascending: sortDir === 'asc' });
          } else if (!sortKey && sort) {
            const [key, dir] = sort.split('.');
            if (key && (dir === 'asc' || dir === 'desc') && allowedSortKeys.includes(key)) {
              safeQ = safeQ.order(key, { ascending: dir === 'asc' });
            } else {
              safeQ = safeQ.order('created_at', { ascending: false });
            }
          }

          const safeRes: any = await safeQ;
          let safeData = safeRes.data ?? safeRes;
          const safeCount = safeRes.count ?? null;

          // Apply boolean filters in JS using tolerant helpers
          if (onlyLaunch) {
            safeData = (safeData || []).filter((p: any) => !!(p?.is_launch || p?.launch || p?.isNew || p?.is_new));
          }
          if (onlyFeatured) {
            safeData = (safeData || []).filter((p: any) => !!(p?.is_destaque || p?.destaque || p?.is_featured || p?.featured));
          }
          if (onlyBestSeller) {
            safeData = (safeData || []).filter((p: any) => !!(p?.is_best_seller || p?.bestseller || p?.is_bestseller || p?.best_seller));
          }

          data = safeData || [];
          count = safeCount;
          } catch (inner) {
          console.error('[api/products] safe fallback failed', inner);
          const innerMsg = String(((inner as any)?.message || inner));
          if (/permission|policy|rls|not authenticated|forbidden/i.test(innerMsg)) {
            return NextResponse.json({ error: innerMsg }, { status: 403 });
          }
          return NextResponse.json({ error: innerMsg }, { status: 500 });
        }
      } else {
        if (/permission|policy|rls|not authenticated|forbidden/i.test(msg)) {
          return NextResponse.json({ error: msg }, { status: 403 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    let returned = data || [];
      // If we couldn't detect server-side columns, apply boolean filters in JS
      if (onlyLaunch && !launchCol) {
        returned = (returned as any[]).filter((p) => !!(p?.is_launch || p?.launch || p?.isNew || p?.is_new));
      }
      if (onlyFeatured && !featuredCol) {
        returned = (returned as any[]).filter((p) => !!(p?.is_destaque || p?.destaque || p?.is_featured || p?.featured));
      }
      if (onlyBestSeller && !bestCol) {
        returned = (returned as any[]).filter((p) => !!(p?.is_best_seller || p?.bestseller || p?.is_bestseller || p?.best_seller));
      }
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
