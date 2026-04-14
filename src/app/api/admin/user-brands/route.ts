import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // auth check
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // only admin/master allowed
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'master'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // use service client to bypass RLS and compute counts server-side
    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all product rows for this user (use range to avoid PostgREST default row limits)
    const { data: prodData, error: prodErr } = await service
      .from('products')
      .select('brand')
      .eq('user_id', userId)
      .not('brand', 'is', null)
      .range(0, 1000000);
    if (prodErr) throw prodErr;

    const normalize = (s: string) => {
      try {
        return s
          .toString()
          .normalize('NFKD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      } catch (e) {
        return (s || '').toString().trim().toLowerCase();
      }
    };

    const countsMap: Record<string, number> = {};
    (prodData || []).forEach((r: any) => {
      try {
        const raw = (r.brand || '').toString();
        const key = normalize(raw);
        if (!key) return;
        countsMap[key] = (countsMap[key] || 0) + 1;
      } catch (e) {
        // ignore
      }
    });

    // Enrich with brands table to get canonical casing and include brands with zero products
    const { data: brandsTable } = await service.from('brands').select('name').eq('user_id', userId);

    const result: Array<{ name: string; count: number }> = [];
    const seen = new Set<string>();

    if (Array.isArray(brandsTable)) {
      brandsTable.forEach((b: any) => {
        const name = (b?.name || '').toString().trim();
        if (!name) return;
        const key = normalize(name);
        seen.add(key);
        result.push({ name, count: countsMap[key] || 0 });
      });
    }

    // Add remaining counted brands that weren't present in brands table
    Object.entries(countsMap).forEach(([key, cnt]) => {
      if (seen.has(key)) return;
      // fallback: present the normalized key as upper-case label
      const pretty = key.toUpperCase();
      result.push({ name: pretty, count: cnt });
    });

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    // If debug flag present, include raw counts map to help troubleshooting
    const debugMode = url.searchParams.get('debug');
    if (debugMode === '1') {
      return NextResponse.json({ brands: result, countsMap });
    }

    return NextResponse.json({ brands: result });
  } catch (err: any) {
    console.error('user-brands error', err);
    return NextResponse.json({ error: err.message || 'Erro' }, { status: 500 });
  }
}
