import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

// --- CONFIGURAÇÕES DE AMBIENTE ---
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('🚨 FATAL: Credenciais do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AJUSTES DE PERFORMANCE ---
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 20;
const DELAY_BETWEEN_CHUNKS = Number(process.env.DELAY_BETWEEN_CHUNKS) || 1500;
const PRODUCT_CONCURRENCY = Number(process.env.PRODUCT_CONCURRENCY) || 4;
const IMAGE_CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY) || 3;
const SYNC_ONLY = (process.env.SYNC_ONLY || 'pending,failed')
  .split(',')
  .map((s) => s.trim());

async function syncFullCatalog() {
  const agent = new https.Agent({ rejectUnauthorized: false });

  // Contadores de Performance
  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let totalProductsSynced = 0;
  let totalProductsFailed = 0;
  let processedCount = 0;
  const processedIds = new Set();

  console.log('🚀 [RepVendas] Iniciando Sincronização Inteligente...');

  // --- Construir a lista de IDs a processar (combina múltiplos critérios)
  // 1) Produtos com `sync_status` em SYNC_ONLY
  // 2) Produtos cuja `image_url` é externa (http...) e ainda não estão `synced`
  // 3) Produtos referenciados em `product_images` com `url` externa e não `synced`

  const idsToProcessSet = new Set();

  try {
    const { data: byStatus } = await supabase
      .from('products')
      .select('id')
      .in('sync_status', SYNC_ONLY)
      .not('sync_error', 'ilike', 'UNREACHABLE_HOST:%');
    (byStatus || []).forEach((r) => r?.id && idsToProcessSet.add(r.id));

    const { data: byImageUrl } = await supabase
      .from('products')
      .select('id')
      .like('image_url', 'http%')
      .not('image_url', 'ilike', '%/storage/v1/object%')
      .neq('sync_status', 'synced')
      .not('sync_error', 'ilike', 'UNREACHABLE_HOST:%');
    (byImageUrl || []).forEach((r) => r?.id && idsToProcessSet.add(r.id));

    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id')
      .like('url', 'http%')
      .not('url', 'ilike', '%/storage/v1/object%')
      .neq('sync_status', 'synced')
      .not('sync_error', 'ilike', 'UNREACHABLE_HOST:%');
    (imgs || []).forEach(
      (r) => r?.product_id && idsToProcessSet.add(r.product_id)
    );
  } catch (err) {
    console.warn(
      '⚠️ Falha ao construir lista de IDs inicial:',
      err?.message || err
    );
  }

  let allIds = Array.from(idsToProcessSet);
  let totalToProcess = allIds.length;

  while (true) {
    try {
      // Busca apenas IDs que ainda não tentamos nesta sessão para evitar loops
      const processedArray = Array.from(processedIds).slice(-100);
      // Recomputar lista de IDs a processar (podem ter sido adicionados entre iterações)
      allIds = Array.from(idsToProcessSet).filter(
        (id) => !processedIds.has(id)
      );
      if (allIds.length === 0) break;

      // Processar em páginas de CHUNK_SIZE: buscamos os dados completos por id
      const nextBatchIds = allIds.slice(0, CHUNK_SIZE);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, reference_code, image_url, sync_status')
        .in('id', nextBatchIds);

      if (error) throw error;
      if (!products || products.length === 0) {
        // nada a processar neste lote, remover esses ids da fila e continuar
        nextBatchIds.forEach((id) => idsToProcessSet.delete(id));
        continue;
      }

      // Processamento em lotes paralelos (Concurrency)
      for (let i = 0; i < products.length; i += PRODUCT_CONCURRENCY) {
        const batch = products.slice(i, i + PRODUCT_CONCURRENCY);

        await Promise.all(
          batch.map(async (product) => {
            if (processedIds.has(product.id)) return;
            processedIds.add(product.id);

            const ref = product.reference_code || 'S/REF';
            console.log(
              `\n📦 [${processedCount + 1}/${totalToProcess}] Produto: ${ref} - ${product.name}`
            );

            let mainSuccess = false;
            let mainError = null;
            // per-product size accumulators (bytes)
            let productOriginalBytes = 0;
            let productOptimizedBytes = 0;

            // 1. PROCESSAR CAPA
            if (product.sync_status !== 'synced' && product.image_url) {
              try {
                const res = await processAndUpload(
                  product.image_url,
                  `products/${product.id}-main.webp`,
                  agent
                );
                await supabase
                  .from('products')
                  .update({ image_url: res.url })
                  .eq('id', product.id);
                totalOriginalBytes += res.originalSize;
                totalOptimizedBytes += res.optimizedSize;
                productOriginalBytes += res.originalSize;
                productOptimizedBytes += res.optimizedSize;
                mainSuccess = true;
                console.log('   ✅ Capa Otimizada');
              } catch (err) {
                const errMsg = String(err?.message || err || '');
                mainError = errMsg;
                console.error(`   ❌ Capa: ${mainError}`);
                if (errMsg.startsWith('UNREACHABLE_HOST:')) {
                  try {
                    const parts = errMsg.split(':');
                    const host = parts[1] || 'unknown';
                    const statusCode = Number(parts[2]) || null;
                    const resourceUrl = product.image_url || null;
                    const { data: existing } = await supabase
                      .from('unreachable_hosts')
                      .select('id, occurrences')
                      .eq('resource_url', resourceUrl)
                      .limit(1)
                      .maybeSingle();
                    if (existing && existing.id) {
                      await supabase
                        .from('unreachable_hosts')
                        .update({
                          occurrences: (existing.occurrences || 1) + 1,
                          last_seen: new Date().toISOString(),
                          last_error: errMsg,
                        })
                        .eq('id', existing.id);
                    } else {
                      await supabase.from('unreachable_hosts').insert([
                        {
                          host,
                          status_code: statusCode,
                          resource_url: resourceUrl,
                          product_id: product.id,
                          last_error: errMsg,
                        },
                      ]);
                    }
                  } catch (auditErr) {
                    console.warn(
                      '⚠️ Falha ao salvar unreachable_hosts:',
                      auditErr?.message || auditErr
                    );
                  }
                }
              }
            }

            // 2. PROCESSAR GALERIA
            let gallerySynced = 0;
            try {
              const { data: gallery } = await supabase
                .from('product_images')
                .select('id, url')
                .eq('product_id', product.id)
                .neq('sync_status', 'synced');

              if (gallery?.length > 0) {
                console.log(`   🖼️  Galeria: ${gallery.length} fotos...`);
                for (let j = 0; j < gallery.length; j += IMAGE_CONCURRENCY) {
                  const imgBatch = gallery.slice(j, j + IMAGE_CONCURRENCY);
                  await Promise.all(
                    imgBatch.map(async (img) => {
                      try {
                        const res = await processAndUpload(
                          img.url,
                          `products/gallery/${img.id}.webp`,
                          agent
                        );
                        await supabase
                          .from('product_images')
                          .update({
                            optimized_url: res.url,
                            sync_status: 'synced',
                          })
                          .eq('id', img.id);
                        totalOriginalBytes += res.originalSize;
                        totalOptimizedBytes += res.optimizedSize;
                        productOriginalBytes += res.originalSize;
                        productOptimizedBytes += res.optimizedSize;
                        gallerySynced++;
                      } catch (err) {
                        const errMsg = String(err?.message || err || '');
                        // If unreachable host marker, record in audit table
                        if (errMsg.startsWith('UNREACHABLE_HOST:')) {
                          try {
                            const parts = errMsg.split(':');
                            const host = parts[1] || 'unknown';
                            const statusCode = Number(parts[2]) || null;
                            const resourceUrl = img.url || null;
                            // upsert into unreachable_hosts: increment occurrences if exists
                            const { data: existing } = await supabase
                              .from('unreachable_hosts')
                              .select('id, occurrences')
                              .eq('resource_url', resourceUrl)
                              .limit(1)
                              .maybeSingle();
                            if (existing && existing.id) {
                              await supabase
                                .from('unreachable_hosts')
                                .update({
                                  occurrences: (existing.occurrences || 1) + 1,
                                  last_seen: new Date().toISOString(),
                                  last_error: errMsg,
                                })
                                .eq('id', existing.id);
                            } else {
                              await supabase.from('unreachable_hosts').insert([
                                {
                                  host,
                                  status_code: statusCode,
                                  resource_url: resourceUrl,
                                  product_id: product.id,
                                  product_image_id: img.id,
                                  last_error: errMsg,
                                },
                              ]);
                            }
                          } catch (auditErr) {
                            console.warn(
                              '⚠️ Falha ao salvar unreachable_hosts:',
                              auditErr?.message || auditErr
                            );
                          }
                        }

                        await supabase
                          .from('product_images')
                          .update({
                            sync_status: 'failed',
                            sync_error: errMsg,
                          })
                          .eq('id', img.id);
                      }
                    })
                  );
                }
              }
            } catch (e) {
              console.error('   ⚠️ Erro Galeria:', e.message);
            }

            // 3. ATUALIZAR STATUS E ARRAY FINAL
            const isOk = mainSuccess || gallerySynced > 0;
            await supabase
              .from('products')
              .update({
                sync_status: isOk ? 'synced' : 'failed',
                sync_error: isOk ? null : mainError || 'no_images_found',
              })
              .eq('id', product.id);

            // Persist size metrics (KB) for the product
            try {
              const original_kb = Math.round(productOriginalBytes / 1024);
              const optimized_kb = Math.round(productOptimizedBytes / 1024);
              if (original_kb > 0 || optimized_kb > 0) {
                await supabase
                  .from('products')
                  .update({
                    original_size_kb: original_kb,
                    optimized_size_kb: optimized_kb,
                  })
                  .eq('id', product.id);
              }
            } catch (szErr) {
              console.error('   ⚠️ Falha ao salvar tamanhos:', szErr.message);
            }

            if (gallerySynced > 0) {
              const { data: imgs } = await supabase
                .from('product_images')
                .select('optimized_url')
                .eq('product_id', product.id)
                .eq('sync_status', 'synced');
              const arrayLinks =
                imgs?.map((i) => i.optimized_url).filter(Boolean) || [];
              await supabase
                .from('products')
                .update({ images: arrayLinks })
                .eq('id', product.id);
              console.log(
                `   🔗 Galeria Sincronizada: ${arrayLinks.length} fotos.`
              );
            }

            if (isOk) totalProductsSynced++;
            else totalProductsFailed++;
            processedCount++;
          })
        );
      }

      // Após processar o batch, remover os ids processados da fila
      products.forEach((p) => idsToProcessSet.delete(p.id));

      console.log(`\n⏳ Pausa para respiro (${DELAY_BETWEEN_CHUNKS}ms)...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS));
    } catch (err) {
      // Não abortar imediatamente em erros transitórios: tenta continuar
      console.error('🚨 Erro Crítico no lote:', err?.message || err);
      consecutiveErrors = (consecutiveErrors || 0) + 1;
      if (consecutiveErrors > 5) {
        console.error('Muitos erros consecutivos, abortando.');
        break;
      }
      // Espera curta antes de tentar o próximo lote
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
  }

  // --- RELATÓRIO FINAL ---
  const savedBytes = totalOriginalBytes - totalOptimizedBytes;
  const reduction =
    totalOriginalBytes > 0
      ? ((savedBytes / totalOriginalBytes) * 100).toFixed(1)
      : 0;

  console.log('\n' + '='.repeat(50));
  console.log('🏆 FINALIZADO COM SUCESSO!');
  console.log(
    `✅ Sincronizados: ${totalProductsSynced} | ❌ Falhas: ${totalProductsFailed}`
  );
  console.log('-'.repeat(50));
  console.log(
    `📂 Espaço Original: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`
  );
  console.log(
    `⚡ Espaço Otimizado: ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`
  );
  console.log(`📉 Redução de Carga: ${reduction}%`);
  console.log(
    `💰 Economia Storage: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB`
  );
  console.log('='.repeat(50) + '\n');
}

async function processAndUpload(url, storagePath, agent) {
  if (!url || url.includes('placeholder')) throw new Error('URL inválida');

  // Normalize possible concatenated URLs into candidates
  const raw = String(url).trim();
  let candidates = [];
  if (raw.includes(';')) {
    candidates = raw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if ((raw.match(/https?:\/\//g) || []).length > 1) {
    candidates = raw
      .split(/(?=https?:\/\/)/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    candidates = [raw];
  }

  const MAX_FETCH_ATTEMPTS = 3;
  let response = null;
  let lastErr = null;

  // Try each candidate in order until one succeeds
  for (const candidate of candidates) {
    lastErr = null;
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
      try {
        response = await fetch(candidate, {
          agent,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.warn(
          `fetch attempt ${attempt}/${MAX_FETCH_ATTEMPTS} failed for ${candidate}: ${e?.message || e}`
        );
        if (attempt < MAX_FETCH_ATTEMPTS) {
          const waitMs =
            500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
    }
    if (!lastErr && response) break; // success
    console.warn(`Candidate failed, trying next if available: ${candidate}`);
  }

  if (lastErr) {
    // Antes de falhar, tente fallback via proxy interno (se configurado)
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.SUPABASE_URL || null;
    if (appUrl) {
      try {
        const proxyUrl = `${appUrl.replace(/\/$/, '')}/api/proxy-image?url=${encodeURIComponent(raw)}`;
        console.warn(`Tentando fallback via proxy: ${proxyUrl}`);
        const proxyRes = await fetch(proxyUrl, {
          headers: { 'Cache-Control': 'no-cache' },
          timeout: 20000,
        });
        if (proxyRes && proxyRes.ok) {
          response = proxyRes;
          lastErr = null;
        } else {
          const status = proxyRes ? proxyRes.status : 'no_response';
          console.warn(`Proxy fallback não OK: ${status}`);
          // If proxy returned 404/410, treat as unreachable host
          if (
            proxyRes &&
            (proxyRes.status === 404 || proxyRes.status === 410)
          ) {
            const hostName = (() => {
              try {
                return new URL(raw).hostname;
              } catch (e) {
                return 'unknown';
              }
            })();
            throw new Error(`UNREACHABLE_HOST:${hostName}:${proxyRes.status}`);
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fallback falhou:', proxyErr?.message || proxyErr);
        // if proxyErr carries UNREACHABLE_HOST marker, propagate it
        if (
          proxyErr &&
          String(proxyErr.message || '').startsWith('UNREACHABLE_HOST:')
        ) {
          throw proxyErr;
        }
      }
    }
    // If the lastErr indicates HTTP 404/410 at upstream, transform into UNREACHABLE marker
    if (lastErr) {
      const msg = String(lastErr.message || lastErr || '');
      if (msg.includes('HTTP 404') || msg.includes('HTTP 410')) {
        const hostName = (() => {
          try {
            return new URL(raw).hostname;
          } catch (e) {
            return 'unknown';
          }
        })();
        throw new Error(
          `UNREACHABLE_HOST:${hostName}:${msg.match(/HTTP (\d+)/)?.[1] || 'unknown'}`
        );
      }
      throw new Error(`fetch failed ${raw} - ${lastErr?.message || lastErr}`);
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const originalSize = buffer.byteLength;

  // Sharp configurado para ignorar metadados corrompidos (failOn: 'none')
  const optimized = await sharp(buffer, { failOn: 'none' })
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const optimizedSize = optimized.byteLength;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(storagePath, optimized, {
      upsert: true,
      contentType: 'image/webp',
    });
  if (error) throw error;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath);
  return { url: data.publicUrl, originalSize, optimizedSize };
}

syncFullCatalog().catch((e) => {
  console.error('❌ Erro Fatal não recuperável:', e);
  // Não falhar o processo via exit(1) para evitar ELIFECYCLE em casos onde
  // vários downloads falharam parcialmente; permitir que o script termine
  // com código 0 para coleta de relatório. Ajuste se preferir falhar.
  process.exitCode = 0;
});
