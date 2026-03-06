import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies as nextCookies } from 'next/headers';

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];

    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 });

    const supabase = await createRouteSupabase(() => nextCookies());
    if (!supabase) return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });

    const body = await req.json().catch(() => ({}));

    const { data: userResp } = await supabase.auth.getUser();
    const user = (userResp as any)?.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // fetch product to verify ownership and current value
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id,is_destaque,user_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const newValue = typeof body.is_destaque === 'boolean' ? body.is_destaque : !product.is_destaque;

    const { data, error } = await supabase
      .from('products')
      .update({ is_destaque: newValue })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('products/[id]/feature route error', err);
    const msg = err?.message || String(err);
    if (/permission|policy|rls|not authenticated|forbidden/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
