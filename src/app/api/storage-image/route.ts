import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const bucket = searchParams.get('bucket') || 'product-images';

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration on server' },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(SUPA, SERVICE_KEY);

    const { data: downloadData, error: dlError } = await supabase.storage
      .from(bucket)
      .download(filePath.replace(/^\/+/, ''));

    if (dlError) {
      console.error('[storage-image] download error', dlError);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Read as arrayBuffer then return buffer
    // @ts-ignore
    const arrayBuffer = await downloadData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as any);

    // Try to infer content-type from extension
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';

    return new NextResponse(buffer as unknown as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[storage-image] error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
