import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies as nextCookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const supabase = await createRouteSupabase(() => nextCookies());
    if (!supabase) return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });

    const { data, error } = await supabase
      .from('products')
      .select('id,name,slug,price,original_price,image_url,image_path,brand')
      .eq('user_id', userId)
      .eq('is_destaque', true)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(12);

    if (error) throw error;
    return NextResponse.json({ products: data || [] });
  } catch (err: any) {
    console.error('public/featured error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
