import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const url = new URL(req.url);
    const params = url.searchParams;

    const userId = params.get('user_id') || params.get('slug');
    const explicitCompany = params.get('company_id');
    const q = params.get('q') || '';
    const page = Number(params.get('page') || '1');
    const perPage = Number(params.get('per_page') || params.get('limit') || '24');
    const offset = Math.max(0, (page - 1) * perPage);
    const brands = params.get('brands');
    const category = params.get('category');
    const material = params.get('material');
    const polarizado = params.get('polarizado');
    const fotocromatico = params.get('fotocromatico');
    const sort = params.get('sort') || 'created_at';
    const order = (params.get('order') || params.get('dir') || 'desc') as 'asc' | 'desc';

    // numeric/range filters
    const minPrice = params.get('min_price');
    const maxPrice = params.get('max_price');
    const stockMin = params.get('stock_min');
    const stockMax = params.get('stock_max');
    const active = params.get('active');

    // Decide scoping: company_id takes precedence if provided or found via profile
    let companyId: string | null = explicitCompany;
    if (!companyId && userId) {
      const prof = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
      if (prof && (prof as any).data && (prof as any).data.company_id) {
        companyId = (prof as any).data.company_id;
      }
    }

    // projection: only essential fields to reduce payload
    const projection = 'id,name,slug,brand,category,material,price,sale_price,stock_quantity,manage_stock,bestseller,is_launch,polarizado,fotocromatico,images,created_at';

    let query = supabase
      .from('products')
      .select(projection, { count: 'exact' })
      .range(offset, offset + perPage - 1)
      .order(sort, { ascending: order === 'asc' });

    if (companyId) query = query.eq('company_id', companyId);
    else if (userId) query = query.eq('user_id', userId);

    if (q && q.trim().length > 0) {
      const like = `%${q.trim()}%`;
      query = query.or(`name.ilike.${like},reference_code.ilike.${like}`);
    }

    if (brands) {
      const arr = brands.split(',').map((s) => s.trim()).filter(Boolean);
      if (arr.length === 1) query = query.eq('brand', arr[0]);
      else if (arr.length > 1) query = query.in('brand', arr as any);
    }
    // Improved category/class_core matching: accept several variants and
    // attempt case-insensitive, partial matches on both `category` and
    // `class_core`. This helps match values like "OPT + CLIP-ON", "Clipon",
    // "CLIPON" etc.
    const classCoreParam = params.get('class_core');
    if (category || classCoreParam) {
      const raw = String(category || classCoreParam || '').trim();
      if (raw.length > 0) {
        const lower = raw.toLowerCase();
        const cleaned = lower.replace(/[^a-z0-9]+/g, '');
        // Special-case CLIP variants which are common and inconsistent in data
        const patterns: string[] = [];
        if (cleaned.includes('clipon') || (cleaned.includes('clip') && cleaned.includes('on'))) {
          patterns.push('%clip-on%');
          patterns.push('%clipon%');
          patterns.push('%clip%on%');
          patterns.push('%opt%clip%');
          patterns.push('%opt%clip-on%');
        }
        // Always add generic fallbacks
        patterns.push(`%${raw}%`);
        patterns.push(`%${lower}%`);
        patterns.push(`%${cleaned}%`);

        // Deduplicate
        const uniq = Array.from(new Set(patterns)).filter(Boolean);
        // Build OR conditions for PostgREST
        const conds = uniq.map((p) => `category.ilike.${p},class_core.ilike.${p}`).join(',');
        try {
          // Log for debugging when running locally
          // eslint-disable-next-line no-console
          console.debug('[api/catalog] category filter', { raw, cleaned, conds });
          query = query.or(conds);
        } catch (e) {
          // Fallback to ilike on category only
          try {
            query = query.ilike('category', `%${cleaned}%`);
          } catch {
            query = query.eq('category', raw);
          }
        }
      }
    }
    if (material) query = query.eq('material', material);

    if (polarizado === '1' || polarizado === 'true') query = query.eq('polarizado', true);
    if (fotocromatico === '1' || fotocromatico === 'true') query = query.eq('fotocromatico', true);

    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));

    if (stockMin) query = query.gte('stock_quantity', Number(stockMin));
    if (stockMax) query = query.lte('stock_quantity', Number(stockMax));

    if (active === '1' || active === 'true') query = query.eq('is_active', true);

    const res = await query;
    if (res.error) throw res.error;

    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    headers.set('X-Total-Count', String(res.count ?? 0));

    return new NextResponse(JSON.stringify({ products: res.data || [], count: res.count ?? 0 }), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
