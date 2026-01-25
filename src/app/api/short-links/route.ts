import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

function generateShortCode(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
}

// Create or return a short link. Accepts optional `code` for vanity URLs.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      destination_url,
      catalog_id,
      brand_id,
      code: requestedCode,
    } = body || {};

    if (!destination_url)
      return NextResponse.json(
        { error: 'destination_url is required' },
        { status: 400 }
      );

    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    // If a code was requested, normalize it
    const normalizedCode = requestedCode
      ? String(requestedCode).trim().toUpperCase()
      : null;

    // If destination already exists, return it
    const { data: existingByDest } = await supabase
      .from('short_links')
      .select('*')
      .eq('destination_url', destination_url)
      .maybeSingle();

    if (existingByDest) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      return NextResponse.json({
        code: existingByDest.code,
        short_url: `${appUrl.replace(/\/$/, '')}/v/${existingByDest.code}`,
      });
    }

    // If user provided a custom code, ensure uniqueness
    if (normalizedCode) {
      const { data: conflict } = await supabase
        .from('short_links')
        .select('id')
        .eq('code', normalizedCode)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: 'code_taken' }, { status: 409 });
      }
    }

    // Otherwise generate a unique code
    let code = normalizedCode || generateShortCode(6);
    if (!normalizedCode) {
      for (let i = 0; i < 6; i++) {
        const { data: collision } = await supabase
          .from('short_links')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        if (!collision) break;
        code = generateShortCode(6);
      }
    }

    const insertPayload: any = {
      code,
      destination_url,
      catalog_id: catalog_id || null,
      user_id: userId,
      brand_id: brand_id || null,
    };

    const { data: inserted, error } = await supabase
      .from('short_links')
      .insert(insertPayload)
      .select()
      .single();
    if (error || !inserted)
      return NextResponse.json(
        { error: error?.message || 'insert_failed' },
        { status: 500 }
      );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.json({
      code: inserted.code,
      short_url: `${appUrl.replace(/\/$/, '')}/v/${inserted.code}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// List user's links or check availability when `code` query param provided
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const codeQuery = url.searchParams.get('code');

    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (codeQuery) {
      const normalized = codeQuery.trim().toUpperCase();
      const { data: found } = await supabase
        .from('short_links')
        .select('id')
        .eq('code', normalized)
        .maybeSingle();
      return NextResponse.json({ exists: !!found });
    }

    if (!userId)
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { data } = await supabase
      .from('short_links')
      .select('id, code, destination_url, clicks_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// Delete a short link by id (body: { id }) — only owner can delete
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id)
      return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId)
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    // Ensure ownership
    const { data: existing } = await supabase
      .from('short_links')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    if (!existing)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (existing.user_id !== userId)
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { error } = await supabase.from('short_links').delete().eq('id', id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
