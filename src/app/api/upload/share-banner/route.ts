import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import sharp from 'sharp';

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = String(formData.get('userId') || 'anon');
    const brandSlug = String(formData.get('brandSlug') || 'share');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'file_missing' },
        { status: 400 }
      );
    }

    const env = (globalThis as any).process?.env ?? {};
    const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'missing_service_key' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { fetch: (globalThis as any).fetch ?? fetch },
      }
    );

    const bucket = 'product-images';

    // ensure bucket exists (best effort)
    try {
      await supabaseAdmin.storage.createBucket(bucket, { public: true });
    } catch (e) {}

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize with sharp on the server as a final quality gate
    const optimizedBuffer = await sharp(buffer)
      .rotate()
      .resize(1200, 630, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const safeName = safeFileName(`${userId}_share_${Date.now()}.webp`);
    const path = `${brandSlug}/${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, optimizedBuffer as any, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message || String(uploadError) },
        { status: 500 }
      );
    }

    const publicUrl =
      supabaseAdmin.storage.from(bucket).getPublicUrl(path).data?.publicUrl ||
      null;

    return NextResponse.json({ success: true, publicUrl, bucket, path });
  } catch (err: any) {
    console.error('[upload/share-banner] error', err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
