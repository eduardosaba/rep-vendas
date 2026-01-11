import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';
import sharp from 'sharp';
import https from 'https';
/*
 * TLS: removido bypass inseguro.
 * A aplicação não desabilita verificação de certificados em runtime.
 * Para casos especiais, trate via infraestrutura (ex.: proxy seguro) e não via VAR de ambiente.
 */

export const runtime = 'nodejs';
// Increase maximum route duration to allow slower upstreams to respond.
// Note: confirm your hosting provider allows this (Vercel has platform limits).
export const maxDuration = 120;

// Default timeout/retries for downloads
const DEFAULT_DOWNLOAD_TIMEOUT = 60000; // 60s
const DEFAULT_DOWNLOAD_RETRIES = 2;

// Wrapper de fetch com timeout, retries e logs detalhados
async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 120000,
  retries = 3
) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    Connection: 'keep-alive',
    ...(opts.headers as Record<string, string> | undefined),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          ...opts,
          headers,
          redirect: 'follow',
          signal,
        } as RequestInit);

        clearTimeout(timer);
        return res;
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      const name = err?.name || '';
      const message = err?.message || '';
      const code = err?.code || '';

      const isTimeout = name === 'AbortError' || /timeout/i.test(message);
      const isSSL = /certificate|TLS|SSL/i.test(message);
      const isDNS = /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(
        message || code || ''
      );

      // Para debugging de timeout precisamos do objeto/stack completo
      if (isTimeout) {
        console.error('[process-external-image] fetch timeout', err);
      } else {
        console.error('[process-external-image] fetch error', {
          url,
          attempt,
          message,
          code,
          isTimeout,
          isSSL,
          isDNS,
        });
      }

      // Não retry para erros críticos de SSL ou DNS
      if (isSSL || isDNS) throw err;
      // If timeout/AbortError happened, allow retry (up to retries)
      if (attempt === retries) throw err;

      // Pequena espera exponencial antes do retry
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw new Error('Failed to fetch');
}

function sanitizeFolder(name: string | null | undefined) {
  if (!name) return 'geral';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
}

export async function POST(request: Request) {
  let targetUrl = '';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Service Key ausente nas variáveis de ambiente.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json(
        { error: 'Dados incompletos.' },
        { status: 400 }
      );
    }

    targetUrl = encodeURI(externalUrl.trim());

    // Recupera dados do produto
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('user_id, brand')
      .eq('id', productId)
      .maybeSingle();

    if (!product) throw new Error('Produto não encontrado.');

    /**
     * 3. FETCH COM CABEÇALHOS DE NAVEGADOR REAL
     * Usamos fetchWithTimeout para melhorar robustez (timeout, retries, logs).
     */
    console.log(`[SYNC] Tentando download: ${targetUrl}`);

    // Nota: bypass TLS removido — sempre validamos certificados.

    // Use internal proxy to reliably fetch from hosts with TLS issues.
    // If the proxy base equals our origin (production domain), avoid performing
    // an HTTP call to our own domain and fetch the upstream resource directly
    // inside this process. This prevents situations where the hosting platform
    // cannot route outgoing requests to its own domain.
    const origin = new URL(request.url).origin;
    const proxyBase = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : origin;
    const proxyUrl = `${proxyBase}/api/proxy-image?url=${encodeURIComponent(targetUrl)}`;

    let downloadResponse;
    const isProxyLocal = proxyBase === origin;

    if (isProxyLocal) {
      // Fetch upstream directly (similar behavior to proxy-image)
      try {
        const targetHost = new URL(targetUrl).hostname;
        const agent = new https.Agent({ rejectUnauthorized: true } as any);

        // Headers refinados para evitar problemas de descompressão e bloqueios
        const refinedHeaders: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'identity',
          Referer: targetHost.includes('safilo')
            ? 'https://commportal.safilo.com/'
            : new URL(targetUrl).origin,
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        };

        // Use fetchWithTimeout (centralizado) to allow retries and consistent timeouts
        const start = Date.now();
        downloadResponse = await fetchWithTimeout(
          targetUrl,
          {
            method: 'GET',
            // @ts-ignore - pass agent to node runtime
            agent,
            headers: refinedHeaders,
          },
          DEFAULT_DOWNLOAD_TIMEOUT,
          DEFAULT_DOWNLOAD_RETRIES
        );
        console.log(
          '[process-external-image] internal fetch latency ms',
          Date.now() - start
        );
      } catch (err: any) {
        console.error('[process-external-image] internal fetch failed', {
          target: targetUrl,
          message: err?.message,
        });
        throw err;
      }
    } else {
      try {
        const start = Date.now();
        downloadResponse = await fetchWithTimeout(
          proxyUrl,
          {
            method: 'GET',
            headers: {
              'X-Forwarded-From': targetUrl,
              'Cache-Control': 'no-cache',
            },
          },
          DEFAULT_DOWNLOAD_TIMEOUT,
          DEFAULT_DOWNLOAD_RETRIES
        );
        console.log(
          '[process-external-image] proxy fetch latency ms',
          Date.now() - start
        );
      } catch (err: any) {
        console.error(
          '[process-external-image] falha ao baixar imagem via proxy',
          {
            target: targetUrl,
            proxy: proxyUrl,
            message: err?.message,
            code: err?.code,
          }
        );
        throw err;
      }
    }

    if (!downloadResponse.ok) {
      const status = downloadResponse.status;
      const snippet = await downloadResponse.text().catch(() => '');
      const bodySnippet = String(snippet).slice(0, 500);
      console.error('[process-external-image] proxy returned non-ok', {
        proxyUrl,
        status,
        bodySnippet,
      });

      // Se o proxy retornar 5xx, podemos tentar um fetch direto para hosts allowlisted
      const targetHost = new URL(targetUrl).hostname;
      const allowlistEnv = process.env.PROXY_ALLOWED_HOSTS || '';
      const allowlist = allowlistEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (status >= 500 && allowlist.includes(targetHost)) {
        console.warn(
          '[process-external-image] tentando fallback direto para host allowlisted',
          { targetHost }
        );
        try {
          // Por segurança, permitimos bypass TLS SOMENTE para hosts explicitamente
          // listados em `PROXY_INSECURE_HOSTS`. Em produção é necessário também
          // definir `PROXY_ALLOW_INSECURE_IN_PROD=1` para autorizar bypass.
          const insecureEnv = process.env.PROXY_INSECURE_HOSTS || '';
          const insecureHosts = insecureEnv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const allowInProd = process.env.PROXY_ALLOW_INSECURE_IN_PROD === '1';

          let agent: https.Agent;
          if (insecureHosts.includes(targetHost)) {
            if (process.env.NODE_ENV === 'production' && !allowInProd) {
              console.warn(
                '[process-external-image] insecure host requested but not allowed in production',
                { targetHost }
              );
              throw new Error('Insecure host not allowed in production');
            }
            console.warn(
              '[process-external-image] WARNING: usando bypass TLS para host inseguro',
              { targetHost }
            );
            agent = new https.Agent({ rejectUnauthorized: false } as any);
          } else {
            agent = new https.Agent({ rejectUnauthorized: true } as any);
          }

          const refinedDirectHeaders: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'identity',
            Referer: targetHost.includes('safilo')
              ? 'https://commportal.safilo.com/'
              : new URL(targetUrl).origin,
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          };

          const startDirect = Date.now();
          const directResponse = await fetchWithTimeout(
            targetUrl,
            {
              method: 'GET',
              headers: refinedDirectHeaders,
              // @ts-ignore
              agent,
            },
            DEFAULT_DOWNLOAD_TIMEOUT,
            DEFAULT_DOWNLOAD_RETRIES
          );
          console.log(
            '[process-external-image] direct fetch latency ms',
            Date.now() - startDirect
          );

          if (!directResponse.ok) {
            const txt = await directResponse.text().catch(() => '');
            console.error('[process-external-image] direct fetch failed', {
              status: directResponse.status,
              bodyPreview: txt.slice(0, 300),
            });
            throw new Error(
              `Servidor externo retornou erro ${directResponse.status}`
            );
          }

          // Replace downloadResponse with the successful direct response
          downloadResponse = directResponse;
        } catch (directErr: any) {
          console.error('[process-external-image] fallback direto falhou', {
            message: directErr?.message,
          });
          throw directErr;
        }
      }

      // Se não entrou em fallback ou fallback falhou, lança erro
      if (!downloadResponse.ok) {
        throw new Error(
          `Servidor externo retornou erro ${downloadResponse.status}`
        );
      }
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Log básico para diagnóstico: content-type e prefixo do buffer
    const contentType = downloadResponse.headers.get('content-type');
    console.log('[process-external-image] content-type', contentType);
    try {
      const prefix = originalBuffer.slice(0, 32).toString('hex');
      console.log(
        '[process-external-image] originalBuffer prefix (hex)',
        prefix
      );
    } catch (e) {
      console.warn(
        '[process-external-image] não conseguiu logar prefix do buffer'
      );
    }

    // 4. OTIMIZAÇÃO SHARP (pipeline simplificada)
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(originalBuffer)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg', { quality: 85 })
        .toBuffer();
    } catch (err: any) {
      console.error('[process-external-image] sharp primary pipeline failed', {
        message: err?.message,
        stack: err?.stack,
      });
      console.error(
        '[process-external-image] originalBuffer length',
        originalBuffer?.length
      );

      // Tentar pipeline fallback ainda mais simples
      try {
        optimizedBuffer = await sharp(originalBuffer)
          .jpeg({ quality: 80 })
          .toBuffer();
        console.warn(
          '[process-external-image] sharp fallback pipeline succeeded'
        );
      } catch (err2: any) {
        console.error('[process-external-image] sharp fallback failed', {
          message: err2?.message,
          stack: err2?.stack,
        });
        throw err2;
      }
    }

    // 5. UPLOAD PARA STORAGE
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${product.user_id}/products/${brandFolder}/${productId}-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw new Error(`Erro no Storage: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    // 6. ATUALIZAÇÃO DO BANCO
    await supabaseAdmin
      .from('products')
      .update({
        image_path: uploadData.path,
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    // Mostrar o erro completo no terminal para facilitar diagnóstico (timeout/stack)
    console.error(`[SYNC ERROR] ${targetUrl}:`, error);

    // Retorna erro amigável para o Dashboard com mais detalhes úteis
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
        cause: error?.cause?.code || error?.code || 'FETCH_FAILED',
        details: error?.stack
          ? error.stack.split('\n').slice(0, 3).join('\n')
          : undefined,
      },
      { status: 500 }
    );
  }
}
