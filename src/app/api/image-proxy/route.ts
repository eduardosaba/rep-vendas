import dns from 'node:dns';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Força IPv4 em Node 18+ quando disponível
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

function isPrivateHost(host: string) {
  if (!host) return true;
  // IPs privados básicos
  if (/^(127|10|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))\./.test(host))
    return true;
  if (host === 'localhost') return true;
  return false;
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 30000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      redirect: 'follow',
      signal: controller.signal,
    } as RequestInit);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    if (!target)
      return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    if (!/^https?:$/.test(targetUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only http(s) allowed' },
        { status: 400 }
      );
    }

    const host = targetUrl.hostname;
    const allowedEnv = process.env.PROXY_ALLOWED_HOSTS; // comma separated
    if (isPrivateHost(host)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
    }

    if (allowedEnv) {
      const allowed = allowedEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!allowed.includes(host)) {
        return NextResponse.json(
          { error: 'Host not in allowlist' },
          { status: 403 }
        );
      }
    }

    // TLS handling: do NOT change global `NODE_TLS_REJECT_UNAUTHORIZED` here.
    // For local debugging you may set `NODE_TLS_REJECT_UNAUTHORIZED=0` in
    // your development environment manually (not in source). If you need to
    // allow insecure TLS for specific requests, implement a per-request
    // https.Agent/axios httpsAgent instead of mutating process.env.
    const allowInsecure = !!(
      process.env.ALLOW_INSECURE_TLS && process.env.ALLOW_INSECURE_TLS !== '0'
    );
    if (allowInsecure) {
      console.warn(
        'ALLOW_INSECURE_TLS set: Do NOT set NODE_TLS_REJECT_UNAUTHORIZED in source or production. Use only for local debugging.'
      );
    }

    const res = await fetchWithTimeout(
      targetUrl.toString(),
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*;q=0.8',
          Referer: targetUrl.origin,
        },
      },
      45000
    );

    // No global env mutation performed, nothing to restore.

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
    console.error('[image-proxy] error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
