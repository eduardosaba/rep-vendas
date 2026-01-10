import { NextResponse } from 'next/server';
import https from 'https';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) return new NextResponse('URL ausente', { status: 400 });

  try {
    // Agent para ignorar TLS apenas quando explicitamente permitido (dev/debug)
    const agentOptions: { rejectUnauthorized?: boolean } = {
      rejectUnauthorized: true,
    };
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.ALLOW_INSECURE_TLS === '1'
    ) {
      agentOptions.rejectUnauthorized = false;
      console.warn(
        '[proxy-image] TLS verification disabled for proxy (dev/ALLOW_INSECURE_TLS=1)'
      );
    }

    const agent = new https.Agent(agentOptions as any);

    // @ts-ignore - fetch agent typing varies entre runtimes
    const res = await fetch(imageUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
      agent,
    } as RequestInit);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream error', status: res.status },
        { status: 502 }
      );
    }

    const contentType =
      res.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Not an image', contentType },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[proxy-image] error', err?.message || err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
