import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
// import https from 'https';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // --- Segurança: aceitar apenas chamadas autenticadas pelo CRON_SECRET ---
  const authHeader = request.headers.get('authorization');
  const xCron = request.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET || '';
  if (authHeader !== `Bearer ${cronSecret}` && xCron !== cronSecret) {
    return new Response('Não autorizado', { status: 401 });
  }

  // Use service role for storage operations (server URL + service role key)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // TLS handling: do NOT mutate `NODE_TLS_REJECT_UNAUTHORIZED` in runtime code.
  const allowInsecure =
    process.env.ALLOW_INSECURE_TLS === '1' ||
    process.env.ALLOW_INSECURE_TLS === 'true';
  if (allowInsecure) {
    console.warn(
      'ALLOW_INSECURE_TLS set: do NOT change NODE_TLS_REJECT_UNAUTHORIZED in source. For local debugging, set NODE_TLS_REJECT_UNAUTHORIZED in your shell only.'
    );
  }

  // 1. Busca os produtos pendentes com lógica de prioridade:
  // Prioridade 1: Produtos novos (sync_error é nulo)
  // Prioridade 2: Re-padronização (sync_error contém 'Re-padronização')
  // Permite processar um `product_id` específico passado no body (útil para debug)
  let specificProductId: string | null = null;
  try {
    const body = await request.json();
    if (body && (body.product_id || body.id))
      specificProductId = body.product_id || body.id;
  } catch (e) {
    // body vazio ou não-JSON: ignora
  }

  const urlObj = new URL(request.url);
  const debugMode =
    urlObj.searchParams.get('debug') === '1' ||
    urlObj.searchParams.get('debug') === 'true';
  const qProductId =
    urlObj.searchParams.get('product_id') || urlObj.searchParams.get('id');
  if (!specificProductId && qProductId) specificProductId = qProductId;
  const forceMode =
    urlObj.searchParams.get('force') === '1' ||
    urlObj.searchParams.get('force') === 'true';

  let pendingProductsQuery = supabase
    .from('products')
    .select(
      'id, image_url, external_image_url, images, image_path, name, sync_error, sync_status, created_at'
    );

  if (specificProductId) {
    // Quando um produto específico for pedido, respeitamos `force` para reprocessar mesmo se não estiver `pending`.
    pendingProductsQuery = pendingProductsQuery
      .eq('id', specificProductId)
      .limit(1);
  } else {
    pendingProductsQuery = pendingProductsQuery
      .eq('sync_status', 'pending')
      .order('sync_error', { ascending: true, nullsFirst: true }) // NULL (novos) vem primeiro
      .order('created_at', { ascending: false }) // Os mais recentes criados têm preferência
      .limit(10); // Processamos em blocos menores para evitar rate limiting
  }

  const { data: pendingProducts, error: fetchError } =
    await pendingProductsQuery;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pendingProducts || pendingProducts.length === 0) {
    return NextResponse.json({ message: 'Nenhuma imagem pendente.' });
  }

  const results = { success: 0, failed: 0 };

  type SyncErrorEntry = {
    id: string;
    name: string | null;
    error: string;
    stack?: string | undefined;
  };

  const errorsArr: SyncErrorEntry[] = [];

  const getErrorMessage = (e: unknown) => {
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object') {
      const maybeMsg = (e as { message?: unknown }).message;
      if (typeof maybeMsg === 'string') return maybeMsg;
      try {
        return JSON.stringify(maybeMsg) || String(e);
      } catch (_) {
        return String(e);
      }
    }
    return String(e);
  };

  const getErrorStack = (e: unknown) => {
    if (e && typeof e === 'object') {
      const maybeStack = (e as { stack?: unknown }).stack;
      if (typeof maybeStack === 'string') return maybeStack;
    }
    return undefined;
  };

  // Helper: sleep for backoff (moved here to reuse)
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // 2. Loop de processamento (com logs detalhados)
  for (const product of pendingProducts) {
    try {
      // Idempotência: se já existir image_path ou sync_status diferente de 'pending', pulamos
      if (product.image_path) {
        if (!forceMode) {
          console.log(
            `[SYNC-${product.id}] ⏭️  Já possui image_path, pulando.`
          );
          continue;
        } else {
          console.log(
            `[SYNC-${product.id}] ⚠️  image_path existe mas forceMode habilitado — reprocessando.`
          );
        }
      }
      if (product.sync_status && product.sync_status !== 'pending') {
        if (!forceMode) {
          console.log(
            `[SYNC-${product.id}] ⏭️  sync_status=${product.sync_status}, pulando.`
          );
          continue;
        } else {
          console.log(
            `[SYNC-${product.id}] ⚠️  sync_status=${product.sync_status} mas forceMode habilitado — forçando reprocessamento.`
          );
        }
      }

      console.log(
        `[SYNC-${product.id}] 📥 Iniciando processamento: ${product.name}`
      );

      // Helper: fetch with retries + backoff using AbortController for timeout
      // Helper: fetch with retries + backoff using AbortController for timeout
      // Strategy: do a lightweight HEAD first to detect 404 quickly, then GET.
      async function fetchWithRetries(
        url: string,
        attempts = 7,
        timeoutMs = 90000
      ) {
        let lastErr: unknown = null;
        for (let i = 0; i < attempts; i++) {
          let controller: AbortController | null = null;
          try {
            controller = new AbortController();
            const timeoutId = setTimeout(() => controller?.abort(), timeoutMs);

            // 1) HEAD first - fast fail on 404
            try {
              const headRes = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                  Accept: '*/*',
                  Referer: 'https://commportal-images.safilo.com/',
                },
              });
              if (headRes.status === 404) {
                clearTimeout(timeoutId);
                throw new Error('HTTP 404');
              }
              if (headRes.status === 429) {
                // Rate limited on HEAD; respect Retry-After if present
                const ra = headRes.headers.get('retry-after');
                const waitMs = ra ? parseInt(ra, 10) * 1000 : 5000;
                console.warn(
                  `[SYNC-${product.id}] HEAD 429 detected, sleeping ${waitMs}ms`
                );
                clearTimeout(timeoutId);
                if (i < attempts - 1) await sleep(waitMs);
              }
            } catch (e: unknown) {
              // If HEAD indicated 404 we throw; otherwise we'll still try GET below
              const msg = getErrorMessage(e);
              if (String(msg).includes('HTTP 404')) {
                throw new Error('HTTP 404');
              }
            }

            // 2) GET the resource
            const res = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                Accept:
                  'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                Referer: 'https://commportal-images.safilo.com/',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
              },
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
              // Handle rate limiting explicitly
              if (res.status === 429) {
                const ra = res.headers.get('retry-after');
                const waitMs = ra ? parseInt(ra, 10) * 1000 : 5000;
                console.warn(
                  `[SYNC-${product.id}] GET 429 received, Retry-After=${ra}, sleeping ${waitMs}ms`
                );
                if (i < attempts - 1) await sleep(waitMs);
                lastErr = new Error(`HTTP 429`);
                continue; // try again after sleep
              }

              // Log headers for diagnostics
              const hdrs: Record<string, string> = {};
              res.headers.forEach((v, k) => (hdrs[k] = v));
              console.warn(
                `[SYNC-${product.id}] HTTP ${res.status} headers:`,
                hdrs
              );
              throw new Error(`HTTP ${res.status}`);
            }
            const buf = Buffer.from(await res.arrayBuffer());
            return { res, buf };
          } catch (e: unknown) {
            lastErr = e;
            // exponential backoff with jitter
            const base = 200 * Math.pow(2, i);
            const jitter = Math.floor(Math.random() * 200);
            const wait = base + jitter; // e.g., 200 + [0..200]
            console.warn(
              `[SYNC-${product.id}] tentativa ${i + 1} falhou para ${url}: ${getErrorMessage(
                e
              )}. esperando ${wait}ms`
            );
            if (i < attempts - 1) await sleep(wait);
          } finally {
            controller = null;
          }
        }
        throw lastErr;
      }

      // Recolhemos todas as URLs candidatas (images array, external_image_url, legacy image_url)
      const candidateUrls: string[] = [];
      if (Array.isArray(product.images) && product.images.length > 0) {
        for (const u of product.images) if (u) candidateUrls.push(u);
      }
      if (product.external_image_url)
        candidateUrls.push(product.external_image_url);
      if (product.image_url) candidateUrls.push(product.image_url);

      if (candidateUrls.length === 0) {
        throw new Error('Nenhuma URL externa disponível para processamento');
      }

      // Vamos processar cada URL e inserir nas product_images
      let primaryProcessed = false;
      let primaryPublicUrl = '';
      let primaryOptimizedKb = 0;
      let primaryOriginalKb = 0;

      for (let idx = 0; idx < candidateUrls.length; idx++) {
        const url = candidateUrls[idx];
        try {
          console.log(
            `[SYNC-${product.id}] 📥 Baixando imagem (${idx + 1}/${candidateUrls.length}): ${url}`
          );
          const { res, buf } = await fetchWithRetries(url, 3);
          console.log(
            `[SYNC-${product.id}] 🌐 HTTP Status: ${res.status} ${res.statusText}`
          );
          const buffer = buf;
          console.log(
            `[SYNC-${product.id}] 📦 Buffer carregado: ${(buffer.length / 1024).toFixed(2)} KB`
          );

          const originalSizeKb =
            Math.round(
              parseInt(res.headers.get('content-length') || '0') / 1024
            ) || Math.round(buffer.length / 1024);

          // Gerar versões small/medium/large para esta imagem
          const VERSIONS = [
            { suffix: 'small', width: 200, quality: 70 },
            { suffix: 'medium', width: 600, quality: 80 },
            { suffix: 'large', width: 1200, quality: 85 },
          ];

          let mediumBufferSizeForThis = 0;

          for (const version of VERSIONS) {
            const optimizedBuffer = await sharp(buffer)
              .resize(version.width, version.width, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .webp({ quality: version.quality })
              .toBuffer();

            if (version.suffix === 'medium') {
              mediumBufferSizeForThis = Math.round(
                optimizedBuffer.length / 1024
              );
            }

            const fileName = `products/${product.id}-${idx}-${version.suffix}.webp`;

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: true,
              });

            if (uploadError) throw uploadError;
            console.log(
              `[SYNC-${product.id}] ☁️  Upload ${version.suffix} (${idx}): Sucesso`
            );
          }

          // Pausa estratégica para reduzir chance de rate limiting
          await sleep(1000);

          // public URL for medium
          const { data: publicData } = supabase.storage
            .from('product-images')
            .getPublicUrl(`products/${product.id}-${idx}-medium.webp`);

          const publicUrl = publicData.publicUrl;

          // Upsert into product_images (mark primary if idx==0)
          const { error: piError } = await supabase
            .from('product_images')
            .upsert(
              {
                product_id: product.id,
                url: publicUrl,
                is_primary: idx === 0,
                position: idx,
                sync_status: 'synced',
                created_at: new Date().toISOString(),
              },
              { onConflict: 'product_id,url' }
            );

          if (piError) throw piError;

          // If this is the first image (primary), update product summary fields
          if (idx === 0) {
            primaryProcessed = true;
            primaryPublicUrl = publicUrl;
            primaryOptimizedKb = mediumBufferSizeForThis;
            primaryOriginalKb = originalSizeKb;
          }
        } catch (e: unknown) {
          console.error(
            `[SYNC-${product.id}] erro processando url ${url}:`,
            getErrorMessage(e)
          );
          // continue processing other images; do not fail the whole product unless primary failed
          if (idx === 0) {
            // primary image failed; mark as failed and break
            throw e;
          }
        }
      }

      // If primary was processed, persist product fields
      if (!primaryProcessed)
        throw new Error('Falha ao processar imagem primária');

      const imagePathKey = `products/${product.id}-0-medium.webp`;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_path: imagePathKey,
          image_url: primaryPublicUrl,
          sync_status: 'synced',
          sync_error: null,
          original_size_kb: primaryOriginalKb,
          optimized_size_kb: primaryOptimizedKb,
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      console.log(
        `[SYNC-${product.id}] 💚 SUCESSO TOTAL - Economia: ${((1 - primaryOptimizedKb / Math.max(primaryOriginalKb, 1)) * 100).toFixed(1)}%`
      );
      results.success++;
      // Pausa entre produtos para reduzir chance de bloqueio por IP
      await sleep(1500);
    } catch (err: unknown) {
      console.error(`[SYNC-${product.id}] ❌ ERRO:`, getErrorMessage(err));
      console.error(`[SYNC-${product.id}] Stack:`, getErrorStack(err));
      const errorMsg = getErrorMessage(err);
      await supabase
        .from('products')
        .update({
          sync_status: 'failed',
          sync_error: errorMsg,
        })
        .eq('id', product.id);
      results.failed++;
      errorsArr.push({
        id: product.id,
        name: product.name,
        error: errorMsg,
        stack: debugMode ? getErrorStack(err) : undefined,
      });
    }
  }

  return NextResponse.json({
    message: 'Processamento concluído',
    detalhes: results,
    errors: debugMode
      ? errorsArr
      : pendingProducts
          .filter((p) => p.sync_error)
          .map((p) => ({ id: p.id, name: p.name, error: p.sync_error }))
          .slice(0, 5), // Retorna os primeiros 5 erros para debug
  });
}
