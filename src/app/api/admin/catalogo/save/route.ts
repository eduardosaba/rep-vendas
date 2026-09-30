import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const headline = body.headline ?? null;
    const about_text = body.about_text ?? null;
    const cover_image = body.cover_image ?? null;
    const gallery_urls = Array.isArray(body.gallery_urls) ? body.gallery_urls : null;

    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) return NextResponse.json({ success: false, error: 'Chave de serviço do Supabase não configurada' }, { status: 500 });
    const supabaseAdmin = createSupabaseAdmin(String(url), String(svc));

    // find company for this user with fallback
    const { data: profile } = await supabase.from('profiles').select('company_id,organization_id').eq('id', userId).maybeSingle();
    let companyId = (profile as any)?.company_id || (profile as any)?.organization_id;
    if (!companyId) {
      const { data: comp } = await supabaseAdmin
        .from('companies')
        .select('id')
        .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      companyId = comp?.id;
    }
    if (!companyId) return NextResponse.json({ success: false, error: 'Usuário não vinculado a uma empresa' }, { status: 403 });

    const updatePayload: any = {};
    if (headline !== undefined) updatePayload.headline = headline;
    if (about_text !== undefined) updatePayload.about_text = about_text;
    if (cover_image !== undefined) updatePayload.cover_image = cover_image;
    if (gallery_urls !== undefined) updatePayload.gallery_urls = Array.isArray(gallery_urls) ? gallery_urls : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId)
      .select()
      .maybeSingle();

    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
