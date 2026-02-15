import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug')?.toString().trim().toLowerCase();
    if (!slug)
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'service role not configured' },
        { status: 500 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await svc
      .from('public_catalogs')
      .select('user_id')
      .eq('catalog_slug', slug)
      .maybeSingle();

    if (error) {
      console.error('check-slug error', error);
      return NextResponse.json(
        { error: error.message || String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ exists: !!data, owner: data?.user_id ?? null });
  } catch (err: any) {
    console.error('check-slug exception', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
