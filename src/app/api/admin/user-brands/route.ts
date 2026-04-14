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

    const normalizeBrandKey = (value: string) =>
      value
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const grouped = new Map<
      string,
      { count: number; variants: Map<string, number> }
    >();

    (prodData || []).forEach((r: any) => {
      const raw = r?.brand?.toString().trim();
      if (!raw) return;

      const key = normalizeBrandKey(raw);
      if (!key) return;

      const current = grouped.get(key) || {
        count: 0,
        variants: new Map<string, number>(),
      };

      current.count += 1;
      current.variants.set(raw, (current.variants.get(raw) || 0) + 1);
      grouped.set(key, current);
    });

    const result: Array<{
      key: string;
      name: string;
      count: number;
      variants: string[];
    }> = Array.from(grouped.entries()).map(([key, data]) => {
      const orderedVariants = Array.from(data.variants.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0].localeCompare(b[0]);
        })
        .map(([variant]) => variant);

      const displayName = orderedVariants[0] || key;

      return {
        key,
        name: displayName,
        count: data.count,
        variants: orderedVariants,
      };
    });

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    // If debug flag present, include raw counts map to help troubleshooting
    const debugMode = url.searchParams.get('debug');
    if (debugMode === '1') {
      return NextResponse.json({
        brands: result,
        grouped: result.map((b) => ({
          key: b.key,
          name: b.name,
          count: b.count,
          variants: b.variants,
        })),
      });
    }

    return NextResponse.json({ brands: result });
  } catch (err: any) {
    console.error('user-brands error', err);
    return NextResponse.json({ error: err.message || 'Erro' }, { status: 500 });
  }
}
