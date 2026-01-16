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

    const supabase = await createRouteSupabase(() => nextCookies());

    let query: any = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      const esc = search.replace(/%/g, '\\%');
      query = query.or(`name.ilike.%${esc}%,description.ilike.%${esc}%`);
    }

    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
    if (brand) query = query.eq('brand', brand);

    if (sort) {
      const [key, dir] = sort.split('.');
      if (key && (dir === 'asc' || dir === 'desc'))
        query = query.order(key, { ascending: dir === 'asc' });
    }

    if (!idsOnly) query = query.range(from, to);

    const { data, error, count } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

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
          p.image_url?.includes('supabase.co/storage') ||
          p.external_image_url?.includes('supabase.co/storage') ||
          (p.images &&
            Array.isArray(p.images) &&
            p.images.some((i: any) => i?.includes('supabase.co/storage')))
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
