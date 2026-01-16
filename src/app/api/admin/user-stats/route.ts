import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId)
      return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Product count
    const { count: prodCount, error: prodErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (prodErr) throw prodErr;

    // Distinct brands owned
    const { data: brandsData, error: brandsErr } = await supabase
      .from('products')
      .select('brand')
      .eq('user_id', userId)
      .neq('brand', null);
    if (brandsErr) throw brandsErr;
    const brands = Array.from(
      new Set((brandsData || []).map((b: any) => b.brand))
    ).filter(Boolean);

    // Inherited brands via catalog_clones -> source products
    const { data: clonedSources, error: clonesErr } = await supabase
      .from('catalog_clones')
      .select('source_product_id, created_at')
      .eq('target_user_id', userId);
    if (clonesErr) throw clonesErr;

    let inheritedBrands: string[] = [];
    let lastCloneAt: string | null = null;
    if ((clonedSources || []).length > 0) {
      const srcIds = (clonedSources || [])
        .map((c: any) => c.source_product_id)
        .filter(Boolean);
      if (srcIds.length > 0) {
        const { data: srcProducts } = await supabase
          .from('products')
          .select('id,brand')
          .in('id', srcIds as any[])
          .neq('brand', null);
        inheritedBrands = Array.from(
          new Set((srcProducts || []).map((s: any) => s.brand))
        ).filter(Boolean);
      }
      // last clone date
      lastCloneAt = (clonedSources || []).reduce(
        (acc: string | null, cur: any) => {
          if (!cur || !cur.created_at) return acc;
          if (!acc) return cur.created_at;
          return new Date(cur.created_at) > new Date(acc)
            ? cur.created_at
            : acc;
        },
        null as string | null
      );
    }

    return NextResponse.json({
      productCount: prodCount || 0,
      brands,
      inheritedBrands,
      lastCloneAt,
    });
  } catch (err: any) {
    console.error('user-stats error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
