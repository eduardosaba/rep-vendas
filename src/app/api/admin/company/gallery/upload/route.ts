import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const title = String(form.get('title') || '');
    const description = String(form.get('description') || '');
    const category = String(form.get('category') || 'geral');

    if (!file) return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });

    // admin client for storage and DB
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) return NextResponse.json({ success: false, error: 'Chave de serviço do Supabase não configurada' }, { status: 500 });
    const supabaseAdmin = createSupabaseClient(String(url), String(svc));

    // get company_id with fallback
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

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `${companyId}/${Date.now()}_${(file as any).name}`;
    const bucket = 'gallery';

    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buf, { upsert: true });
    if (uploadErr) return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 });

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
    const imageUrl = publicData.publicUrl;

    const { data: inserted, error: insertErr } = await supabaseAdmin.from('company_gallery').insert({
      company_id: companyId,
      image_url: imageUrl,
      title: title || null,
      description: description || null,
      category: category || 'geral'
    }).select().maybeSingle();

    if (insertErr) return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true, data: inserted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
