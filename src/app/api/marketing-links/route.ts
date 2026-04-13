import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, share_banner_url, message, expires_at, metadata } = body || {};

    const supabase = await createRouteSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    
    if (!userId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const cleanUrl = typeof image_url === 'string' && image_url.trim()
        ? image_url.trim()
        : typeof share_banner_url === 'string' && share_banner_url.trim()
        ? share_banner_url.trim()
        : null;

    if (!cleanUrl) {
      return NextResponse.json({ error: 'image_url_required' }, { status: 400 });
    }

    // 1) Atualiza profile (fonte principal para preview compartilhado)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ share_banner_url: cleanUrl }, { returning: 'minimal' } as any)
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2) Tenta registrar histórico em marketing_links (best effort)
    let mkData: any = null;
    try {
      const { data, error } = await supabase
        .from('marketing_links')
        .insert({
          user_id: userId,
          image_url: cleanUrl,
          share_banner_url: cleanUrl,
          og_image_url: cleanUrl,
          message: message || null,
          expires_at: expires_at || null,
          metadata: metadata || null,
        })
        .select()
        .single();
      if (error) {
        console.warn('marketing_links insert warning:', error.message);
      } else {
        mkData = data;
      }
    } catch (e: any) {
      console.warn('marketing_links insert exception:', e?.message || String(e));
    }

    // 3) Tenta atualizar settings/public_catalogs (best effort).
    // Alguns bancos possuem triggers legadas que podem retornar
    // "table name public_catalogs specified more than once".
    try {
      const { error: settingsErr } = await supabase
        .from('settings')
        .update({ share_banner_url: cleanUrl }, { returning: 'minimal' } as any)
        .eq('user_id', userId);
      if (settingsErr) console.warn('settings update warning:', settingsErr.message);
    } catch (e: any) {
      console.warn('settings update exception:', e?.message || String(e));
    }

    try {
      const { error: catErr } = await supabase
        .from('public_catalogs')
        .update({ og_image_url: cleanUrl, share_banner_url: cleanUrl }, { returning: 'minimal' } as any)
        .eq('user_id', userId);
      if (catErr) console.warn('public_catalogs update warning:', catErr.message);
    } catch (e: any) {
      console.warn('public_catalogs update exception:', e?.message || String(e));
    }

    return NextResponse.json({ success: true, data: mkData, image_url: cleanUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    if (!userId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('marketing_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}