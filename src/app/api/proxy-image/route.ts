import { NextResponse } from 'next/server';
import https from 'https';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Helper para fetch com timeout e retries
async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 45000,
  retries = 2
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal } as RequestInit);
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('Failed to fetch');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) return new NextResponse('URL ausente', { status: 400 });

  // Agent TLS será configurado abaixo de forma condicional por host.

  // Consolidated headers
  try {
    const forwardedFrom = request.headers.get('x-forwarded-from') || undefined;
    const referer = forwardedFrom
      ? new URL(forwardedFrom).origin
      : new URL(imageUrl).origin;

    // Decidir agente TLS por host: suportamos bypass apenas para hosts em
    // `PROXY_INSECURE_HOSTS`. Em produção é necessário também definir
    // `PROXY_ALLOW_INSECURE_IN_PROD=1` para autorizar bypass.
    const targetHost = new URL(imageUrl).hostname;
    const insecureEnv = process.env.PROXY_INSECURE_HOSTS || '';
    const insecureHosts = insecureEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowInProd = process.env.PROXY_ALLOW_INSECURE_IN_PROD === '1';

    // TEMPORÁRIO: permitir bypass para hosts Safilo quando necessário (confiado)
    if (targetHost.includes('safilo')) {
      console.warn(
        '[proxy-image] adding safilo host to insecureHosts (temporary)'
      );
      if (!insecureHosts.includes(targetHost)) insecureHosts.push(targetHost);
    }

    let agent: https.Agent | undefined = undefined;
    if (insecureHosts.includes(targetHost)) {
      if (process.env.NODE_ENV === 'production' && !allowInProd) {
        console.warn(
          '[proxy-image] insecure host requested but bypass not allowed in production',
          { targetHost }
        );
        return NextResponse.json(
          { error: 'Host not allowed' },
          { status: 403 }
        );
      }
      console.warn(
        '[proxy-image] WARNING: usando bypass TLS para host inseguro',
        { targetHost }
      );
      agent = new https.Agent({ rejectUnauthorized: false } as any);
    } else {
      agent = new https.Agent({ rejectUnauthorized: true } as any);
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'identity',
      Referer: referer,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    };

    const MAX_RETRIES = 2;
    let lastError: any = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log('[proxy-image] fetch attempt', {
          target: imageUrl,
          attempt,
        });

        // @ts-ignore - pass agent in Node runtime
        const res = await fetchWithTimeout(
          imageUrl,
          {
            method: 'GET',
            redirect: 'follow',
            headers: fetchHeaders,
            // @ts-ignore
            agent,
          },
          45000,
          0
        );

        if (!res.ok) {
          const status = res.status;
          const text = await res.text().catch(() => '');
          const snippet = text.slice(0, 500);
          console.error('[proxy-image] upstream returned non-ok', {
            target: imageUrl,
            status,
            snippet,
          });

          if (status >= 500 && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }

          return NextResponse.json(
            { error: 'Upstream error', status, bodySnippet: snippet },
            { status: 502 }
          );
        }

        const contentType =
          res.headers.get('content-type') || 'application/octet-stream';
        if (!contentType.startsWith('image/')) {
          const text = await res.text().catch(() => '');
          console.error('[proxy-image] upstream returned non-image content', {
            target: imageUrl,
            contentType,
            preview: text.slice(0, 200),
          });
          return NextResponse.json(
            { error: 'Not an image', contentType },
            { status: 400 }
          );
        }

        const arrayBuffer = await res.arrayBuffer();
        let buffer: Buffer = Buffer.from(arrayBuffer as any);

        // Suporte a redimensionamento via query params: w, h, q, format
        const urlObj = new URL(request.url);
        const w = urlObj.searchParams.get('w');
        const h = urlObj.searchParams.get('h');
        const q = urlObj.searchParams.get('q');
        const fmt = (urlObj.searchParams.get('format') || '').toLowerCase();

        // Se solicitado, processe com sharp para reduzir tamanho sem perder qualidade
        if ((w || h || q || fmt) && buffer && buffer.length > 0) {
          try {
            let pipeline = sharp(buffer).rotate();
            // aplica resize se w/h informados
            if (w || h) {
              const wi = w ? Math.max(1, Number(w)) : null;
              const hi = h ? Math.max(1, Number(h)) : null;
              pipeline = pipeline.resize(wi || undefined, hi || undefined, {
                fit: 'inside',
                withoutEnlargement: true,
              });
            }

            const quality = q ? Math.max(30, Math.min(95, Number(q))) : 80;

            if (fmt === 'webp') {
              buffer = await pipeline.webp({ quality }).toBuffer();
            } else if (fmt === 'jpeg' || fmt === 'jpg') {
              buffer = await pipeline.jpeg({ quality }).toBuffer();
            } else if (fmt === 'png') {
              buffer = await pipeline.png().toBuffer();
            } else {
              // default: produce jpeg for better compression
              buffer = await pipeline.jpeg({ quality }).toBuffer();
            }

            // override contentType
            const ct = fmt === 'webp' ? 'image/webp' : 'image/jpeg';
            return new NextResponse(buffer as unknown as any, {
              status: 200,
              headers: {
                'Content-Type': ct,
                'Cache-Control':
                  'public, max-age=86400, stale-while-revalidate=604800',
              },
            });
          } catch (procErr: any) {
            console.error('[proxy-image] sharp processing failed', procErr);
            // fallback: continue to return original buffer below
          }
        }

        return new NextResponse(buffer as unknown as any, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control':
              'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      } catch (err: any) {
        lastError = err;
        // Log completo para diagnóstico (inclui stack e propriedades do erro)
        console.error('[proxy-image] fetch attempt failed', err);
        if (attempt < MAX_RETRIES)
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    console.error('[proxy-image] all attempts failed', {
      target: imageUrl,
      lastError: lastError?.message || String(lastError),
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch upstream after retries',
        details: lastError?.message || String(lastError),
      },
      { status: 502 }
    );
  } catch (err: any) {
    // Log completo para troubleshooting (Timeout/AbortError podem ter propriedades úteis)
    console.error('[proxy-image] error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
