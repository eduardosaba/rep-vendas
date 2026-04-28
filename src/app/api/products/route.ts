import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies as nextCookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    const category = url.searchParams.get('category') || '';
    const material = url.searchParams.get('material') || '';
    const color = url.searchParams.get('color') || '';
    const visibility = url.searchParams.get('visibility') || '';
    const stockStatus = url.searchParams.get('stockStatus') || '';

    // --- ADICIONE ESTAS DUAS LINHAS ABAIXO ---
    const onlyPolarized = url.searchParams.get('polarizado') === 'true';
    const onlyPhotochromic = url.searchParams.get('fotocromatico') === 'true';

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
    const featuredCol = pickCol([
      'is_destaque',
      'destaque',
      'is_featured',
      'featured',
    ]);
    const bestCol = pickCol([
      'is_best_seller',
      'bestseller',
      'is_bestseller',
      'best_seller',
    ]);
    // --- ADICIONE ESTAS DUAS LINHAS ABAIXO ---
    const polarCol = pickCol(['polarizado', 'polarized', 'is_polarized']);
    const photoCol = pickCol([
      'fotocromatico',
      'photochromic',
      'is_photochromic',
    ]);

    // Comece sempre com um `select` antes de encadear filtros (compatibilidade com Postgrest)
    // Por padrão, só retornamos produtos ativos. Admins podem enviar includeInactive=true.
    let query: any = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
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
        // Query base para todos os contadores
        let baseQ: any = supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('user_id', userId);

        // Aplica filtros de segurança (Ativos/Inativos)
        if (!includeInactive && activeCol) baseQ = baseQ.eq(activeCol, true);

        // Adicione aqui os filtros que devem afetar o "Total" dos cards
        if (onlyPolarized && polarCol) baseQ = baseQ.eq(polarCol, true);
        if (onlyPhotochromic && photoCol) baseQ = baseQ.eq(photoCol, true);
        if (brand) baseQ = baseQ.eq('brand', brand);
        if (category) baseQ = baseQ.ilike('category', `%${category}%`);
        if (material) baseQ = baseQ.ilike('material', `%${material}%`);
        if (color) baseQ = baseQ.ilike('color', `%${color}%`);
        if (visibility === 'active' && activeCol)
          baseQ = baseQ.eq(activeCol, true);
        if (visibility === 'inactive' && activeCol)
          baseQ = baseQ.eq(activeCol, false);
        if (stockStatus === 'out_of_stock')
          baseQ = baseQ.lte('stock_quantity', 0);
        if (stockStatus === 'in_stock') baseQ = baseQ.gt('stock_quantity', 0);

        // 1. Total Filtrado
        const { count: totalCount } = await baseQ;

        // 2. Lançamentos (dentro do que já está filtrado)
        let launchQ = baseQ;
        if (launchCol) launchQ = launchQ.eq(launchCol, true);
        const { count: launchCount } = await launchQ;

        // 3. Best Sellers (dentro do que já está filtrado)
        let bestQ = baseQ;
        if (bestCol) bestQ = bestQ.eq(bestCol, true);
        const { count: bestCount } = await bestQ;

        // 4. Destaques (dentro do que já está filtrado)
        let featuredQ = baseQ;
        if (featuredCol) featuredQ = featuredQ.eq(featuredCol, true);
        const { count: featuredCount } = await featuredQ;

        // 5. Marcas (Total de marcas distintas dentro do filtro)
        let brandsQ = supabase
          .from('products')
          .select('brand')
          .eq('user_id', userId);

        // Aplica os mesmos filtros na contagem de marcas
        if (!includeInactive && activeCol)
          brandsQ = brandsQ.eq(activeCol, true);
        if (onlyPolarized && polarCol) brandsQ = brandsQ.eq(polarCol, true);
        if (onlyPhotochromic && photoCol) brandsQ = brandsQ.eq(photoCol, true);
        if (brand) brandsQ = brandsQ.eq('brand', brand);
        if (category) brandsQ = brandsQ.ilike('category', `%${category}%`);
        if (material) brandsQ = brandsQ.ilike('material', `%${material}%`);
        if (color) brandsQ = brandsQ.ilike('color', `%${color}%`);
        if (visibility === 'active' && activeCol)
          brandsQ = brandsQ.eq(activeCol, true);
        if (visibility === 'inactive' && activeCol)
          brandsQ = brandsQ.eq(activeCol, false);
        if (stockStatus === 'out_of_stock')
          brandsQ = brandsQ.lte('stock_quantity', 0);
        if (stockStatus === 'in_stock')
          brandsQ = brandsQ.gt('stock_quantity', 0);

        const { data: brandsData } = await brandsQ;
        const brandsCount = new Set(
          (brandsData || []).map((r: any) => r.brand).filter(Boolean)
        ).size;

        return NextResponse.json({
          aggregate: {
            total: totalCount ?? 0,
            brands: brandsCount,
            launch: launchCount ?? 0,
            featured: featuredCount ?? 0,
            best: bestCount ?? 0,
          },
        });
      } catch (e: any) {
        console.error('[api/products] aggregate failed', e);
        return NextResponse.json(
          { error: e?.message || String(e) },
          { status: 500 }
        );
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
    if (category) query = query.ilike('category', `%${category}%`);
    if (material) query = query.ilike('material', `%${material}%`);
    if (color) query = query.ilike('color', `%${color}%`);
    if (visibility === 'active' && activeCol) query = query.eq(activeCol, true);
    if (visibility === 'inactive' && activeCol)
      query = query.eq(activeCol, false);
    if (stockStatus === 'out_of_stock') query = query.lte('stock_quantity', 0);
    if (stockStatus === 'in_stock') query = query.gt('stock_quantity', 0);

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
    // --- ADICIONE ESTES DOIS BLOCOS ABAIXO ---
    if (onlyPolarized && polarCol) {
      query = query.eq(polarCol, true);
    }
    if (onlyPhotochromic && photoCol) {
      query = query.eq(photoCol, true);
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

      const isMissingCol =
        /column .* does not exist|Could not find the '([\w_]+)' column/i.test(
          msg
        );
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
            if (!includeInactive && activeCol)
              safeQ = safeQ.eq(activeCol, true);
          } else {
            if (!idsOnly) {
              safeQ = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .range(from, to);
              if (!includeInactive && activeCol)
                safeQ = safeQ.eq(activeCol, true);
            } else {
              safeQ = supabase
                .from('products')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .range(0, 20000);
              if (!includeInactive && activeCol)
                safeQ = safeQ.eq(activeCol, true);
            }
          }

          if (search) {
            const esc = search.replace(/%/g, '\\%');
            safeQ = safeQ.or(`name.ilike.%${esc}%,description.ilike.%${esc}%`);
          }
          if (minPrice) safeQ = safeQ.gte('price', parseFloat(minPrice));
          if (maxPrice) safeQ = safeQ.lte('price', parseFloat(maxPrice));
          if (brand) safeQ = safeQ.eq('brand', brand);
          if (category) safeQ = safeQ.ilike('category', `%${category}%`);
          if (material) safeQ = safeQ.ilike('material', `%${material}%`);
          if (color) safeQ = safeQ.ilike('color', `%${color}%`);
          if (visibility === 'active' && activeCol)
            safeQ = safeQ.eq(activeCol, true);
          if (visibility === 'inactive' && activeCol)
            safeQ = safeQ.eq(activeCol, false);
          if (stockStatus === 'out_of_stock')
            safeQ = safeQ.lte('stock_quantity', 0);
          if (stockStatus === 'in_stock') safeQ = safeQ.gt('stock_quantity', 0);
          if (sortKey && sortDir && allowedSortKeys.includes(sortKey)) {
            safeQ = safeQ.order(sortKey, { ascending: sortDir === 'asc' });
          } else if (!sortKey && sort) {
            const [key, dir] = sort.split('.');
            if (
              key &&
              (dir === 'asc' || dir === 'desc') &&
              allowedSortKeys.includes(key)
            ) {
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
            safeData = (safeData || []).filter(
              (p: any) => !!(p?.is_launch || p?.launch || p?.isNew || p?.is_new)
            );
          }
          if (onlyFeatured) {
            safeData = (safeData || []).filter(
              (p: any) =>
                !!(
                  p?.is_destaque ||
                  p?.destaque ||
                  p?.is_featured ||
                  p?.featured
                )
            );
          }
          if (onlyBestSeller) {
            safeData = (safeData || []).filter(
              (p: any) =>
                !!(
                  p?.is_best_seller ||
                  p?.bestseller ||
                  p?.is_bestseller ||
                  p?.best_seller
                )
            );
          }
          // JS fallback filtering for category/material/color/visibility/stockStatus
          if (category) {
            safeData = (safeData || []).filter(
              (p: any) =>
                p?.category &&
                String(p.category)
                  .toLowerCase()
                  .includes(String(category).toLowerCase())
            );
          }
          if (material) {
            safeData = (safeData || []).filter(
              (p: any) =>
                p?.material &&
                String(p.material)
                  .toLowerCase()
                  .includes(String(material).toLowerCase())
            );
          }
          if (color) {
            safeData = (safeData || []).filter(
              (p: any) =>
                p?.color &&
                String(p.color)
                  .toLowerCase()
                  .includes(String(color).toLowerCase())
            );
          }
          if (visibility === 'active') {
            safeData = (safeData || []).filter(
              (p: any) => p?.is_active !== false
            );
          }
          if (visibility === 'inactive') {
            safeData = (safeData || []).filter(
              (p: any) => p?.is_active === false
            );
          }
          if (stockStatus === 'out_of_stock') {
            safeData = (safeData || []).filter(
              (p: any) => (p?.stock_quantity || 0) <= 0
            );
          }
          if (stockStatus === 'in_stock') {
            safeData = (safeData || []).filter(
              (p: any) => (p?.stock_quantity || 0) > 0
            );
          }
          // JS fallback filtering for polarizado / photochromic
          if (onlyPolarized) {
            safeData = (safeData || []).filter(
              (p: any) => !!(p?.polarizado || p?.polarized || p?.is_polarized)
            );
          }
          if (onlyPhotochromic) {
            safeData = (safeData || []).filter(
              (p: any) =>
                !!(p?.fotocromatico || p?.photochromic || p?.is_photochromic)
            );
          }

          data = safeData || [];
          count = safeCount;
        } catch (inner) {
          console.error('[api/products] safe fallback failed', inner);
          const innerMsg = String((inner as any)?.message || inner);
          if (
            /permission|policy|rls|not authenticated|forbidden/i.test(innerMsg)
          ) {
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
      returned = (returned as any[]).filter(
        (p) => !!(p?.is_launch || p?.launch || p?.isNew || p?.is_new)
      );
    }
    if (onlyFeatured && !featuredCol) {
      returned = (returned as any[]).filter(
        (p) =>
          !!(p?.is_destaque || p?.destaque || p?.is_featured || p?.featured)
      );
    }
    if (onlyBestSeller && !bestCol) {
      returned = (returned as any[]).filter(
        (p) =>
          !!(
            p?.is_best_seller ||
            p?.bestseller ||
            p?.is_bestseller ||
            p?.best_seller
          )
      );
    }
    // JS fallback when polar/photo columns not detected server-side
    if (onlyPolarized && !polarCol) {
      returned = (returned as any[]).filter(
        (p) => !!(p?.polarizado || p?.polarized || p?.is_polarized)
      );
    }
    if (onlyPhotochromic && !photoCol) {
      returned = (returned as any[]).filter(
        (p) => !!(p?.fotocromatico || p?.photochromic || p?.is_photochromic)
      );
    }
    // JS fallback filtering for category/material/color/visibility/stockStatus
    if (category) {
      returned = (returned as any[]).filter(
        (p) =>
          p?.category &&
          String(p.category)
            .toLowerCase()
            .includes(String(category).toLowerCase())
      );
    }
    if (material) {
      returned = (returned as any[]).filter(
        (p) =>
          p?.material &&
          String(p.material)
            .toLowerCase()
            .includes(String(material).toLowerCase())
      );
    }
    if (color) {
      returned = (returned as any[]).filter(
        (p) =>
          p?.color &&
          String(p.color).toLowerCase().includes(String(color).toLowerCase())
      );
    }
    if (visibility === 'active') {
      returned = (returned as any[]).filter((p) => p?.is_active !== false);
    }
    if (visibility === 'inactive') {
      returned = (returned as any[]).filter((p) => p?.is_active === false);
    }
    if (stockStatus === 'out_of_stock') {
      returned = (returned as any[]).filter(
        (p) => (p?.stock_quantity || 0) <= 0
      );
    }
    if (stockStatus === 'in_stock') {
      returned = (returned as any[]).filter(
        (p) => (p?.stock_quantity || 0) > 0
      );
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
