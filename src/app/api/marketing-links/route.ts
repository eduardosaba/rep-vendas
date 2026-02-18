import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

// POST: create a marketing link record (image + optional message + expires_at)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, share_banner_url, use_short_link, message, expires_at, metadata } = body || {};

    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    if (!userId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    // Limpeza da URL: prefer image_url, depois share_banner_url
    const cleanUrl =
      typeof image_url === 'string' && image_url.trim()
        ? image_url.trim()
        : typeof share_banner_url === 'string' && share_banner_url.trim()
        ? share_banner_url.trim()
        : null;

    if (!cleanUrl) {
      return NextResponse.json({ error: 'image_url_required' }, { status: 400 });
    }

    // Payload para marketing_links (inclui og_image_url)
    const marketingPayload: any = {
      user_id: userId,
      image_url: cleanUrl,
      share_banner_url: cleanUrl,
      og_image_url: cleanUrl,
      use_short_link: typeof use_short_link === 'boolean' ? use_short_link : true,
      message: message || null,
      expires_at: expires_at || null,
      metadata: metadata || null,
    };

    // Executa as três operações principais em paralelo para performance
    const [mkRes, profileRes, catalogRes] = await Promise.all([
      supabase.from('marketing_links').insert(marketingPayload).select().single(),
      supabase.from('profiles').update({ share_banner_url: cleanUrl }).eq('id', userId),
      supabase
        .from('public_catalogs')
        .update({ share_banner_url: cleanUrl, og_image_url: cleanUrl })
        .eq('user_id', userId),
    ]);

    // Se inserção de marketing falhar, retornamos erro
    if (mkRes.error) {
      return NextResponse.json({ error: mkRes.error.message || 'marketing_insert_failed' }, { status: 500 });
    }

    // Se algum dos updates falhar, tentamos rollback da inserção em marketing_links
    if (profileRes.error || catalogRes.error) {
      try {
        // tenta limpar o registro duplicado para evitar estado parcial
        if (mkRes.data && mkRes.data.id) {
          await supabase.from('marketing_links').delete().eq('id', mkRes.data.id);
        }
      } catch (e) {
        console.warn('Rollback failed for marketing_links insert', e);
      }

      console.error('Sync errors', { profileErr: profileRes.error, catalogErr: catalogRes.error });
      return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: mkRes.data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// GET: list current user's marketing links
export async function GET(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    if (!userId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('marketing_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error?.message || 'query_failed' }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
