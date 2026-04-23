import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const title = String(form.get('title') || '');
    const description = String(form.get('description') || '');
    const category = String(form.get('category') || 'geral');

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

    // get company_id from profile
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return NextResponse.json({ success: false, error: 'User not linked to company' }, { status: 403 });

    // admin client for storage
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) return NextResponse.json({ success: false, error: 'Missing service role key' }, { status: 500 });
    const supabaseAdmin = createSupabaseClient(String(url), String(svc));

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
