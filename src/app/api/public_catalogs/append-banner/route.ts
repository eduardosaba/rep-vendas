import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, publicUrl, mobile } = body || {};
    if (!slug || !publicUrl) {
      return NextResponse.json(
        { error: 'slug and publicUrl required' },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'server misconfigured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing, error: selErr } = await supabase
      .from('public_catalogs')
      .select('id, banners, banners_mobile')
      .eq('slug', String(slug))
      .maybeSingle();

    if (selErr) throw selErr;
    if (!existing)
      return NextResponse.json({ error: 'catalog not found' }, { status: 404 });

    const field = mobile ? 'banners_mobile' : 'banners';
    const current = Array.isArray((existing as any)[field])
      ? (existing as any)[field]
      : [];
    const normalized = String(publicUrl).trim();
    // avoid duplicates
    const merged = [
      normalized,
      ...current.filter((s: string) => s !== normalized),
    ];

    const updatePayload: any = {};
    updatePayload[field] = merged;
    updatePayload.updated_at = new Date().toISOString();

    const { error: upErr } = await supabase
      .from('public_catalogs')
      .update(updatePayload)
      .eq('slug', String(slug));

    if (upErr) throw upErr;

    return NextResponse.json({ success: true, banners: merged });
  } catch (err: any) {
    console.error('append-banner error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
