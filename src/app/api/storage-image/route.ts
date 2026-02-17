import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const debug = searchParams.get('debug');
  const envDebug = process.env.STORAGE_IMAGE_DEBUG === '1';
  const debugEnabled = debug === '1' || envDebug;
  const bucketParam = searchParams.get('bucket');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // Early validation: reject obviously-bad values fast to avoid cascading timeouts
  const lower = filePath.toLowerCase?.() || '';
  const invalidInputs = ['undefined', 'null', 'none', 'n/a', ''];
  if (invalidInputs.includes(lower) || filePath.length < 5) {
    console.warn('[storage-image] short-circuit invalid path:', filePath);
    return returnPlaceholderSvg('INVALID PATH', 404, {
      'Cache-Control': 'public, max-age=60',
    });
  }

  // 1. Configurações do Supabase (Server-side)
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPA || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Supabase credentials not found' },
      { status: 500 }
    );
  }

  // 2. Normalização do Path e Bucket
  // Remove barras iniciais e espaços
  let effectivePath = filePath.replace(/^\/+/, '').trim();
  let effectiveBucket = bucketParam || 'product-images';

  // Lógica de Legado: Se o path vier como "product-images/diretorio/foto.jpg"
  if (!bucketParam && effectivePath.startsWith('product-images/')) {
    effectiveBucket = 'product-images';
    effectivePath = effectivePath.replace(/^product-images\/?/, '');
  }

  try {
    const supabase = createClient(SUPA, SERVICE_KEY);

    // 3. Download do arquivo do Storage (com tentativas de fallback mais robustas)
    let downloadData: any = null;
    let dlError: any = null;

    // Timeout curto configurável (ms)
    const DOWNLOAD_TIMEOUT =
      Number(process.env.STORAGE_IMAGE_TIMEOUT_MS) || 4000;

    // Use signed URL + fetch with AbortController so we can enforce a timeout
    const attemptDownload = async (bucket: string, path: string) => {
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60);
        if (signErr || !signed?.signedUrl) {
          return { data: null, error: signErr || new Error('no signed url') };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          DOWNLOAD_TIMEOUT
        );
        try {
          const fetchRes = await fetch(signed.signedUrl, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!fetchRes.ok) {
            return {
              data: null,
              error: new Error(`fetch failed ${fetchRes.status}`),
            };
          }
          const arrayBuffer = await fetchRes.arrayBuffer();
          // normalize shape to supabase.download-like return
          return { data: { arrayBuffer: () => arrayBuffer }, error: null };
        } catch (e) {
          clearTimeout(timeoutId);
          return { data: null, error: e };
        }
      } catch (e) {
        return { data: null, error: e };
      }
    };

    // Construir candidatos de buckets e paths para tentar cobrir formatos divergentes
    const candidateBuckets = Array.from(
      new Set([effectiveBucket, 'product-images'])
    );
    const candidatePaths = Array.from(
      new Set([
        effectivePath,
        effectivePath.replace(/^public\//, ''),
        effectivePath.replace(/^product-images\//, ''),
        effectivePath.replace(/^product-images\/public\//, ''),
        effectivePath.replace('/public/', '/'),
        `public/${effectivePath}`,
      ])
    );

    // try candidates but with early bailouts and diagnostic logging
    console.debug('[storage-image] download candidates', {
      requested: filePath,
      effectiveBucket,
      candidateBuckets,
      candidatePaths,
      timeoutMs: DOWNLOAD_TIMEOUT,
      debugEnabled,
    });

    const attemptLog: Array<{
      bucket: string;
      path: string;
      ok: boolean;
      error?: string | null;
    }> = [];

    for (const b of candidateBuckets) {
      for (const p of candidatePaths) {
        const { data, error } = await attemptDownload(b, p);
        const ok = Boolean(data && !error);
        attemptLog.push({
          bucket: b,
          path: p,
          ok,
          error: error ? String((error as any)?.message || error) : null,
        });
        if (ok) {
          downloadData = data;
          dlError = null;
          effectiveBucket = b;
          effectivePath = p;
          break;
        }
        dlError = error || dlError;
        // log short info for each failed candidate when debug enabled
        if (debugEnabled) {
          console.warn('[storage-image] candidate failed', {
            bucket: b,
            path: p,
            error: String((error as any)?.message ?? error),
          });
        }
      }
      if (downloadData) break;
    }

    if (dlError || !downloadData) {
      console.error('[storage-image] 404 ou Erro:', {
        requested: filePath,
        lastTried: { bucket: effectiveBucket, path: effectivePath },
        error: dlError,
        attempts: attemptLog.length,
      });
      if (debugEnabled) {
        return NextResponse.json(
          {
            ok: false,
            requested: filePath,
            bucket: effectiveBucket,
            path: effectivePath,
            error: String(dlError?.message || dlError),
            attempts: attemptLog,
          },
          { status: 404 }
        );
      }
      return returnPlaceholderSvg(effectivePath, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    // 4. Processamento do Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Identificação do Content-Type (MIME)
    const ext = effectivePath.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      svg: 'image/svg+xml',
      gif: 'image/gif',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (debug === '1') {
      return NextResponse.json(
        {
          ok: true,
          bucket: effectiveBucket,
          path: effectivePath,
          contentType,
          size: buffer.length,
        },
        { status: 200 }
      );
    }

    // 6. Resposta com Cache agressivo para performance
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        // Cache de 1 dia no navegador, 7 dias no servidor (Vercel/Cloudflare)
        'Cache-Control':
          'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[storage-image] Erro Crítico:', err?.message, err);
    return returnPlaceholderSvg('Erro interno', 500, {
      'Cache-Control': 'public, max-age=60',
    });
  }
}

/**
 * Retorna um SVG amigável em caso de erro para não quebrar o layout da tabela.
 */
function returnPlaceholderSvg(
  message: string,
  status: number,
  extraHeaders?: Record<string, string>
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="100%" height="100%" fill="#f8fafc" />
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold">
        IMAGEM
      </text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="10">
        ${message.length > 20 ? 'NÃO ENCONTRADA' : message.toUpperCase()}
      </text>
    </svg>
  `.trim();

  const headers: Record<string, string> = Object.assign(
    {
      'Content-Type': 'image/svg+xml',
      // cache curto para placeholders: evita repetição de fetchs pesados
      'Cache-Control': 'public, max-age=60',
    },
    extraHeaders || {}
  );

  return new NextResponse(svg, {
    status,
    headers,
  });
}
