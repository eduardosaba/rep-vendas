import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || url.searchParams.get('slug');
    if (!userId) return NextResponse.json({ types: [] });

    // Fetch category, class_core and tipo_montagem for this user
    const { data, error } = await supabase
      .from('products')
      .select('category,class_core,tipo_montagem')
      .eq('user_id', userId);

    if (error) throw error;

    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      if (r && r.tipo_montagem) set.add(String(r.tipo_montagem).trim());
      if (r && r.class_core) set.add(String(r.class_core).trim());
      if (r && r.category) set.add(String(r.category).trim());
    });

    return NextResponse.json({ types: Array.from(set).filter(Boolean) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
