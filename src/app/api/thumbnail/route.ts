import sharp from 'sharp';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const url = params.get('url');
    const w = parseInt(params.get('w') || '200', 10);
    const q = parseInt(params.get('q') || '60', 10);

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

    // Convert Node Buffer to a Uint8Array to satisfy Web/Request typings
    const ui = new Uint8Array(out);

    return new Response(ui, {
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
