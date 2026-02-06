import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { sourceUrl, brandId, asset } = body || {};
    if (!sourceUrl || !brandId || !asset)
      return NextResponse.json(
        { error: 'sourceUrl, brandId and asset are required' },
        { status: 400 }
      );

    // derive storage path from public URL if possible
    let sourcePath = sourceUrl;
    try {
      const u = new URL(sourceUrl);
      const seg = u.pathname.split('/');
      // expected: /storage/v1/object/public/<path...>
      const idx = seg.indexOf('public');
      if (idx >= 0) {
        sourcePath = seg.slice(idx + 1).join('/');
      }
    } catch (e) {
      // leave as-is
    }

    await inngest.send({
      name: 'image/copy_brand.requested',
      data: {
        sourcePath,
        targetUserId: user.id,
        brandId,
        asset,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('copy-on-write-brand route error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
