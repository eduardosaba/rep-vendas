import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const name = (form.get('name') as string) || file.name;
    // basic validation
    const allowed = [
      'font/woff2',
      'font/woff',
      'application/font-woff',
      'font/ttf',
      'font/otf',
      'application/octet-stream',
    ];
    if (
      !allowed.includes(file.type) &&
      !file.name.match(/\.(woff2|woff|ttf|otf)$/i)
    ) {
      return NextResponse.json({ error: 'Invalid font type' }, { status: 400 });
    }
    if (file.size > 2_000_000) {
      return NextResponse.json(
        { error: 'File too large (>2MB)' },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const fileExt = file.name.split('.').pop();
    const fileName = `public/${user.id}/fonts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    // upload via storage -> use dedicated `fonts` bucket
    const uploadRes = await supabase.storage
      .from('fonts')
      .upload(
        fileName,
        file as any,
        {
          upsert: true,
          contentType: file.type,
          cacheControl: 'public, max-age=31536000, immutable',
        } as any
      );
    if (uploadRes.error) {
      return NextResponse.json(
        { error: uploadRes.error.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('fonts')
      .getPublicUrl(fileName);
    return NextResponse.json({ name, url: urlData.publicUrl });
  } catch (err: any) {
    console.error('upload font error', err);
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
