import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, share_banner_url, message, expires_at, metadata } = body || {};

    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    
    if (!userId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const cleanUrl = typeof image_url === 'string' && image_url.trim()
        ? image_url.trim()
        : typeof share_banner_url === 'string' && share_banner_url.trim()
        ? share_banner_url.trim()
        : null;

    if (!cleanUrl) {
      return NextResponse.json({ error: 'image_url_required' }, { status: 400 });
    }

    // 1. Inserção em marketing_links
    const { data: mkData, error: mkError } = await supabase
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

    if (mkError) {
      console.error('Erro marketing_links:', mkError);
      return NextResponse.json({ error: mkError.message }, { status: 500 });
    }

    // 2. Atualiza Profile
    const profileRes = await supabase.from('profiles').update({ share_banner_url: cleanUrl }, { returning: 'minimal' }).eq('id', userId);

    // 3. Atualiza public_catalogs - CORREÇÃO AQUI
    // Usamos head: true ou apenas não pedimos retorno para evitar o erro de tabela duplicada
    const { error: catError } = await supabase
      .from('public_catalogs')
      .update({
        og_image_url: cleanUrl,
      }, { returning: 'minimal' })
      .eq('user_id', userId);

    if (catError) {
      console.error('Erro public_catalogs:', catError);
      // Não travamos o processo aqui, pois o marketing_link e profile já foram
    }

    return NextResponse.json({ success: true, data: mkData });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}