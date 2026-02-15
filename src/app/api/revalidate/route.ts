import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies as nextCookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const supabase = await createRouteSupabase(() => nextCookies());

    // Verify that the current session user owns this catalog
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

    const { data: pc } = await supabase
      .from('public_catalogs')
      .select('catalog_slug, user_id')
      .eq('catalog_slug', slug)
      .maybeSingle();

    if (!pc || pc.user_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    try {
      revalidatePath(`/catalogo/${slug}`);
    } catch (e) {
      console.warn('revalidatePath failed', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('/api/revalidate error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
