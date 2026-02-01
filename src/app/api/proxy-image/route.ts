import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Proxy + optional optimizer for external images.
 * Query params:
 *  - url: encoded target image URL (required)
 *  - w, h, q, format: optional resizing/quality/format passed to sharp
 *  - fallback=1: if upstream fails, redirect to original URL
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const encoded = searchParams.get('url');
    if (!encoded)
      return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

    const imageUrl = decodeURIComponent(encoded);
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          lastError = new Error(`upstream status ${res.status}`);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            continue;
          }
          return NextResponse.json(
            { error: 'Upstream error', status: res.status },
            { status: res.status }
          );
        }

        const contentType =
          res.headers.get('content-type') || 'application/octet-stream';
        if (!contentType.startsWith('image/')) {
          // optionally redirect to original
          if (searchParams.get('fallback') === '1')
            return NextResponse.redirect(imageUrl);
          return NextResponse.json(
            { error: 'Not an image', contentType },
            { status: 400 }
          );
        }

        const arrayBuffer = await res.arrayBuffer();
        let buffer: any = Buffer.from(arrayBuffer as any);

        const w = searchParams.get('w');
        const h = searchParams.get('h');
        const q = searchParams.get('q');
        const fmt = (searchParams.get('format') || '').toLowerCase();

        if ((w || h || q || fmt) && buffer.length > 0) {
          try {
            // dynamic import to avoid requiring sharp in environments where it's not available
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const sharp = await import('sharp');
            let pipeline = (sharp.default || sharp)(buffer).rotate();
            if (w || h) {
              const wi = w ? Math.max(1, Number(w)) : undefined;
              const hi = h ? Math.max(1, Number(h)) : undefined;
              pipeline = pipeline.resize(wi, hi, {
                fit: 'inside',
                withoutEnlargement: true,
              });
            }
            const quality = q ? Math.max(30, Math.min(95, Number(q))) : 80;
            if (fmt === 'webp') {
              const out = await pipeline.webp({ quality }).toBuffer();
              buffer = out as unknown as Buffer;
            } else if (fmt === 'jpeg' || fmt === 'jpg') {
              const out = await pipeline.jpeg({ quality }).toBuffer();
              buffer = out as unknown as Buffer;
            } else if (fmt === 'png') {
              const out = await pipeline.png().toBuffer();
              buffer = out as unknown as Buffer;
            } else {
              const out = await pipeline.jpeg({ quality }).toBuffer();
              buffer = out as unknown as Buffer;
            }
            const outCt = fmt === 'webp' ? 'image/webp' : 'image/jpeg';
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                'Content-Type': outCt,
                'Cache-Control':
                  'public, s-maxage=31536000, stale-while-revalidate=59',
              },
            });
          } catch (procErr) {
            console.error('[proxy-image] sharp failed', procErr);
            // fallthrough to return original buffer
          }
        }

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control':
              'public, s-maxage=31536000, stale-while-revalidate=59',
          },
        });
      } catch (err: any) {
        lastError = err;
        console.error('[proxy-image] fetch attempt failed', err);
        if (attempt < MAX_RETRIES - 1)
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }

    if (searchParams.get('fallback') === '1')
      return NextResponse.redirect(imageUrl);
    return NextResponse.json(
      {
        error: 'Failed to fetch upstream after retries',
        details: String(lastError),
      },
      { status: 502 }
    );
  } catch (err: any) {
    console.error('[proxy-image] error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
