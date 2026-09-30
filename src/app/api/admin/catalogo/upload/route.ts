import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      console.warn('[upload] unauthenticated request');
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });

    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) {
      console.error('[upload] missing service role or url env vars', { svc: Boolean(svc), url: Boolean(url) });
      return NextResponse.json({ success: false, error: 'Chave de serviço do Supabase não configurada' }, { status: 500 });
    }
    const supabaseAdmin = createSupabaseClient(String(url), String(svc));

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('company_id,organization_id,role').eq('id', userId).maybeSingle();
    if (profileErr) {
      console.error('[upload] error loading profile', profileErr.message || profileErr);
      return NextResponse.json({ success: false, error: 'Falha ao carregar perfil' }, { status: 500 });
    }
    let companyId = (profile as any)?.company_id || (profile as any)?.organization_id;
    const role = (profile as any)?.role;
    if (!companyId) {
      const { data: comp } = await supabaseAdmin
        .from('companies')
        .select('id')
        .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      companyId = comp?.id;
    }
    if (!companyId) {
      console.warn(`[upload] user ${userId} (role=${role}) has no company_id`);
      return NextResponse.json({ success: false, error: 'Usuário não vinculado a uma empresa', detail: role ? `role=${role}` : undefined }, { status: 403 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `${companyId}/catalog/${Date.now()}_${(file as any).name}`;
    const bucket = 'gallery';

    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buf, { upsert: true });
    if (uploadErr) {
      console.error('[upload] storage.upload error', uploadErr.message || uploadErr);
      return NextResponse.json({ success: false, error: 'Storage upload failed', detail: uploadErr.message }, { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
    const imageUrl = publicData.publicUrl;

    console.log(`[upload] user=${userId} company=${companyId} uploaded ${filename}`);
    return NextResponse.json({ success: true, url: imageUrl });
  } catch (err: any) {
    console.error('[upload] unexpected error', err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
