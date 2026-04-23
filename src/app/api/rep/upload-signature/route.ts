import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dataUrl = String(body?.dataUrl || '');
    const companyId = String(body?.companyId || 'public');
    const repId = String(body?.repId || 'anon');

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ success: false, error: 'Formato de assinatura inválido.' }, { status: 400 });
    }

    const base64 = dataUrl.replace('data:image/png;base64,', '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Assinatura fora do limite permitido.' }, { status: 400 });
    }

    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Credenciais do servidor indisponíveis.' }, { status: 500 });
    }

    const bucket = 'order-pdfs';
    const filename = `${companyId}/signatures/${repId}_${Date.now()}.png`;

    const { error: uploadErr } = await admin.storage.from(bucket).upload(filename, buffer, {
      contentType: 'image/png',
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 });
    }

    const { data } = admin.storage.from(bucket).getPublicUrl(filename);

    return NextResponse.json({ success: true, url: data.publicUrl, path: filename });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erro ao subir assinatura.' }, { status: 500 });
  }
}
