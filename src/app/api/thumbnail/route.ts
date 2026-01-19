import sharp from 'sharp';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    const w = parseInt(request.nextUrl.searchParams.get('w') || '200', 10);
    const q = parseInt(request.nextUrl.searchParams.get('q') || '60', 10);

    if (!url) {
      return new Response('Missing url', { status: 400 });
    }

    // Fetch remote image
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      return new Response('Upstream fetch failed', { status: 502 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Resize + convert to webp for thumbnails
    const out = await sharp(buffer)
      .resize(w, w, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();

    return new Response(out, {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[thumbnail] error', err?.message || err);
    return new Response(String(err?.message || 'error'), { status: 500 });
  }
}
