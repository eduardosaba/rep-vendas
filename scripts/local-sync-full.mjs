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
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

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

// Responsiveness sizes (w) for gallery/main variants
// Otimizado: 480w (mobile), 1200w (desktop)
const RESPONSIVE_SIZES = [480, 1200];
const BUCKET =
  process.env.PRODUCT_IMAGES_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'product-images';
const CREATE_BUCKETS =
  (process.env.CREATE_BUCKETS || 'false').toLowerCase() === 'true';

// helper to ensure bucket exists (idempotent)
async function ensureBucket(bucketName) {
  try {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });
    if (error && !/already exists/i.test(String(error.message || ''))) {
      throw error;
    }
    return true;
  } catch (e) {
    // If createBucket is not allowed or returns 409, try to ignore
    if (
      String(e.message || '')
        .toLowerCase()
        .includes('already exists')
    )
      return true;
    console.warn('ensureBucket warning:', e.message || e);
    return false;
  }
}

async function uploadToBucket(
  bucketName,
  path,
  buf,
  contentType = 'image/webp'
) {
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, buf, { upsert: true, contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data?.publicUrl;
}

async function getPublicUrlFromBucket(bucketName, path) {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data?.publicUrl;
}
const CHECKPOINT_FILE =
  process.env.SYNC_CHECKPOINT_FILE || '.sync-checkpoint.json';
const MAX_RETRIES = Number(process.env.IMAGE_MAX_RETRIES) || 3;

async function syncFullCatalog() {
  const agent = new https.Agent({ rejectUnauthorized: false });

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let totalProductsSynced = 0;
  let totalProductsFailed = 0;
  let processedCount = 0;
  let consecutiveErrors = 0;
  const processedIds = new Set();

  console.log('🚀 [RepVendas] Iniciando Sincronização Turbo (Local)...');

  const idsToProcessSet = new Set();

  try {
    // 1) Busca por status pendente
    const { data: byStatus } = await supabase
      .from('products')
      .select('id')
      .in('sync_status', SYNC_ONLY);
    (byStatus || []).forEach((r) => r?.id && idsToProcessSet.add(r.id));

    // 2) Busca por URLs externas (Tommy/Safilo)
    const { data: byImageUrl } = await supabase
      .from('products')
      .select('id')
      .like('image_url', 'http%')
      .not('image_url', 'ilike', '%/storage/v1/object%')
      .neq('sync_status', 'synced');
    (byImageUrl || []).forEach((r) => r?.id && idsToProcessSet.add(r.id));
  } catch (err) {
    console.warn('⚠️ Falha ao construir lista de IDs:', err.message);
  }

  // Carrega checkpoint (ids processados) para permitir resume
  try {
    const fs = await import('fs');
    if (fs.existsSync && fs.existsSync(CHECKPOINT_FILE)) {
      const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
      const cp = JSON.parse(raw || '{"processed":[]}');
      if (Array.isArray(cp.processed)) {
        for (const id of cp.processed) idsToProcessSet.delete(id);
        console.log(
          `🔁 Checkpoint carregado: removidos ${cp.processed.length} ids já processados`
        );
      }
    }
  } catch (e) {
    // não bloqueante
  }

  let allIds = Array.from(idsToProcessSet);
  let totalToProcess = allIds.length;

  while (true) {
    allIds = Array.from(idsToProcessSet).filter((id) => !processedIds.has(id));
    if (allIds.length === 0) break;

    const nextBatchIds = allIds.slice(0, CHUNK_SIZE);
    const { data: products, error } = await supabase
      .from('products')
      .select(
        'id, name, reference_code, image_url, sync_status, images, brand, user_id'
      )
      .in('id', nextBatchIds);

    if (error) throw error;
    if (!products || products.length === 0) {
      nextBatchIds.forEach((id) => idsToProcessSet.delete(id));
      continue;
    }

    for (let i = 0; i < products.length; i += PRODUCT_CONCURRENCY) {
      const batch = products.slice(i, i + PRODUCT_CONCURRENCY);

      await Promise.all(
        batch.map(async (product) => {
          if (processedIds.has(product.id)) return;
          processedIds.add(product.id);

          const ref = product.reference_code || 'S/REF';
          console.log(
            `📦 [${processedCount + 1}/${totalToProcess}] Processando: ${ref}`
          );

          let mainSuccess = false;
          let mainError = null;
          let productOriginalBytes = 0;
          let productOptimizedBytes = 0;

          // 1. PROCESSAR IMAGEM PRINCIPAL (CAPA)
          if (product.sync_status !== 'synced') {
            // marca como processing para evitar re-processamento concorrente
            await supabase
              .from('products')
              .update({ sync_status: 'processing' })
              .eq('id', product.id);

            // prefira imagem com sufixo P00 nas possíveis imagens da galeria
            const pickCoverFromImages = (() => {
              try {
                const imgs = product.images || [];
                if (Array.isArray(imgs) && imgs.length > 0) {
                  // imgs may be array of strings or objects
                  for (const it of imgs) {
                    const url =
                      typeof it === 'string' ? it : it.url || it.path || null;
                    if (url && /P00\./i.test(url)) return url;
                  }
                  // fallback: first url-like
                  const first = imgs[0];
                  return typeof first === 'string' ? first : first?.url || null;
                }
              } catch (e) {
                return null;
              }
              return null;
            })();

            const coverUrl = pickCoverFromImages || product.image_url;
            if (coverUrl) {
              try {
                const brandRaw = product.brand || product.user_id || 'unknown';
                const brandSlug =
                  String(brandRaw || 'unknown')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') || 'unknown';

                // Sanitizar reference_code para uso em path
                const refCode = (product.reference_code || product.id)
                  .trim()
                  .replace(/[^a-zA-Z0-9-_]/g, '_')
                  .substring(0, 100); // Limita tamanho

                // decide target bucket and storage base depending on CREATE_BUCKETS
                let targetBucket = BUCKET;
                let storageBase = '';
                if (CREATE_BUCKETS) {
                  targetBucket = `${BUCKET}-${brandSlug}`;
                  await ensureBucket(targetBucket);
                  storageBase = `products/${refCode}/main`;
                } else {
                  storageBase = `public/brands/${brandSlug}/products/${refCode}/main`;
                }

                const res = await processAndUploadVariants(
                  coverUrl,
                  storageBase,
                  agent,
                  RESPONSIVE_SIZES,
                  targetBucket
                );

                // choose largest variant as main
                const mainVariant = res.variants.reduce((a, b) =>
                  a.size > b.size ? a : b
                );

                // ATUALIZAÇÃO COMPATÍVEL
                await supabase
                  .from('products')
                  .update({
                    image_url: mainVariant.url,
                    image_path: mainVariant.path,
                    image_optimized: true,
                    // keep a record of variants for frontend
                    image_variants: res.variants.map((v) => ({
                      size: v.size,
                      url: v.url,
                      path: v.path,
                    })),
                  })
                  .eq('id', product.id);

                totalOriginalBytes += res.originalSize;
                totalOptimizedBytes += res.optimizedTotal;
                productOriginalBytes += res.originalSize;
                productOptimizedBytes += res.optimizedTotal;
                mainSuccess = true;
                console.log('   ✅ Capa Otimizada');
              } catch (err) {
                mainError = String(err?.message || err);
                console.error(`   ❌ Capa: ${mainError}`);
              }
            } else {
              console.log('   ⚠️ Sem URL de capa encontrada');
            }
          }

          // 2. PROCESSAR GALERIA SECUNDÁRIA
          let gallerySynced = 0;
          try {
            let { data: gallery } = await supabase
              .from('product_images')
              .select('id, url')
              .eq('product_id', product.id)
              .neq('sync_status', 'synced');

            // If there are no product_images rows, try to create them from product.images (handles concatenated URLs from import)
            if ((!gallery || gallery.length === 0) && product.images) {
              try {
                const toInsert = [];
                const seen = new Set();

                const extractUrls = (input) => {
                  const out = [];
                  if (!input) return out;
                  if (Array.isArray(input)) {
                    for (const it of input) {
                      if (!it) continue;
                      if (typeof it === 'object') {
                        if (it.url) out.push(String(it.url).trim());
                        else if (it.path) out.push(String(it.path).trim());
                      } else if (typeof it === 'string') {
                        out.push(
                          ...String(it)
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                        );
                      }
                    }
                  } else if (typeof input === 'string') {
                    out.push(...input.split(/[;,]+/).map((s) => s.trim()));
                  }
                  return out.filter(Boolean);
                };

                const rawUrls = extractUrls(product.images || []);
                // Ensure cover is included too (some imports stored cover in image_url)
                if (product.image_url && !rawUrls.includes(product.image_url)) {
                  rawUrls.unshift(product.image_url);
                }

                for (let idx = 0; idx < rawUrls.length; idx++) {
                  const u = rawUrls[idx];
                  if (!u) continue;
                  const key = u.split('?')[0].replace(/#.*$/, '');
                  if (seen.has(key)) continue;
                  seen.add(key);
                  const isExternal = u.startsWith('http');
                  const isInternal =
                    u.includes(SUPABASE_URL) ||
                    u.includes('/storage/v1/object');
                  toInsert.push({
                    product_id: product.id,
                    url: u,
                    sync_status: isInternal ? 'synced' : 'pending',
                    is_primary: idx === 0,
                    position: idx,
                    created_at: new Date().toISOString(),
                  });
                }

                if (toInsert.length > 0) {
                  const { error: insErr } = await supabase
                    .from('product_images')
                    .insert(toInsert);
                  if (insErr) {
                    console.warn(
                      '   ⚠️ Falha ao criar product_images:',
                      insErr.message || insErr
                    );
                  } else {
                    console.log(
                      `   ℹ️ Criados ${toInsert.length} registros em product_images a partir de products.images`
                    );
                    // reload gallery
                    const gResp = await supabase
                      .from('product_images')
                      .select('id, url')
                      .eq('product_id', product.id)
                      .neq('sync_status', 'synced');
                    gallery = gResp.data || [];
                  }
                }
              } catch (e) {
                console.warn(
                  '   ⚠️ Erro ao popular product_images from products.images:',
                  e.message || e
                );
              }
            }

            if (gallery?.length > 0) {
              for (let j = 0; j < gallery.length; j += IMAGE_CONCURRENCY) {
                const imgBatch = gallery.slice(j, j + IMAGE_CONCURRENCY);
                await Promise.all(
                  imgBatch.map(async (img) => {
                    try {
                      // Proteção: some imports erroneamente salvaram várias URLs
                      // concatenadas em um único campo separado por ';'.
                      const rawUrl = img.url ? String(img.url) : '';
                      const cleanUrl = rawUrl.includes(';')
                        ? rawUrl.split(';')[0].trim()
                        : rawUrl.trim();

                      const brandRaw =
                        product.brand || product.user_id || 'unknown';
                      const brandSlug =
                        String(brandRaw || 'unknown')
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '') || 'unknown';

                      let targetBucket = BUCKET;
                      let baseGalleryPath = '';
                      if (CREATE_BUCKETS) {
                        targetBucket = `${BUCKET}-${brandSlug}`;
                        await ensureBucket(targetBucket);
                        baseGalleryPath = `products/${product.id}/gallery/${img.id}`;
                      } else {
                        baseGalleryPath = `public/brands/${brandSlug}/products/${product.id}/gallery/${img.id}`;
                      }

                      // Split múltiplas URLs (ex: "url1;url2" ou "url1,url2")
                      const parts = rawUrl
                        .split(/[;,]/)
                        .map((s) => s.trim())
                        .filter(Boolean);

                      if (parts.length === 0) return;

                      for (let pi = 0; pi < parts.length; pi++) {
                        const partUrl = parts[pi];
                        try {
                          const res = await processAndUploadVariants(
                            partUrl,
                            `${baseGalleryPath}${pi > 0 ? `-${pi}` : ''}`,
                            agent,
                            RESPONSIVE_SIZES,
                            targetBucket
                          );

                          // pick main variant for gallery entry
                          const galleryMain = res.variants.reduce((a, b) =>
                            a.size > b.size ? a : b
                          );

                          if (pi === 0) {
                            // Atualiza a linha existente com o primeiro resultado
                            await supabase
                              .from('product_images')
                              .update({
                                optimized_url: galleryMain.url,
                                storage_path: galleryMain.path,
                                optimized_variants: res.variants.map((v) => ({
                                  size: v.size,
                                  url: v.url,
                                  path: v.path,
                                })),
                                sync_status: 'synced',
                              })
                              .eq('id', img.id);
                          } else {
                            // Para URLs adicionais, cria novas linhas já marcadas como 'synced'
                            await supabase.from('product_images').insert([
                              {
                                product_id: product.id,
                                url: partUrl,
                                optimized_url: galleryMain.url,
                                storage_path: galleryMain.path,
                                optimized_variants: res.variants.map((v) => ({
                                  size: v.size,
                                  url: v.url,
                                  path: v.path,
                                })),
                                sync_status: 'synced',
                                created_at: new Date().toISOString(),
                              },
                            ]);
                          }

                          totalOriginalBytes += res.originalSize;
                          totalOptimizedBytes += res.optimizedTotal;
                          productOriginalBytes += res.originalSize;
                          productOptimizedBytes += res.optimizedTotal;
                          gallerySynced++;
                        } catch (err) {
                          console.error(`   ❌ Galeria item: ${err.message}`);
                        }
                      }
                    } catch (err) {
                      console.error(`   ❌ Galeria item: ${err.message}`);
                    }
                  })
                );
              }
            }
          } catch (e) {
            console.error('   ⚠️ Erro Galeria:', e.message);
          }

          // 3. FINALIZAR ESTADOS DO PRODUTO E JSONB IMAGES
          let isOk = mainSuccess || gallerySynced > 0;

          // Só marcar como 'synced' se NÃO houver imagens pendentes em product_images
          try {
            const { count, error: pendingErr } = await supabase
              .from('product_images')
              .select('id', { count: 'exact', head: true })
              .eq('product_id', product.id)
              .neq('sync_status', 'synced');

            if (pendingErr) {
              console.warn(
                '   ⚠️ Erro ao verificar product_images pendentes:',
                pendingErr.message || pendingErr
              );
            } else {
              const pending = count || 0;
              if (pending > 0) {
                isOk = false;
              }
            }
          } catch (e) {
            console.warn(
              '   ⚠️ Falha ao checar pendentes de product_images:',
              e.message || e
            );
          }

          // Buscar galeria completa para montar o JSONB de objetos {url, path}
          const { data: finalImgs } = await supabase
            .from('product_images')
            .select('optimized_url, storage_path')
            .eq('product_id', product.id)
            .eq('sync_status', 'synced');

          const imageObjects =
            finalImgs?.map((i) => ({
              url: i.optimized_url,
              path: i.storage_path,
            })) || [];

          // Also include pending/external images from product_images (preserve until internalized)
          try {
            const { data: allGallery } = await supabase
              .from('product_images')
              .select('url, optimized_url, storage_path, sync_status')
              .eq('product_id', product.id)
              .order('position', { ascending: true });

            const merged = [];
            const seenUrls = new Set();

            // 1) add internalized (synced) variants first (we already have imageObjects)
            for (const it of imageObjects) {
              const key = (it.url || '').split('?')[0];
              if (!key) continue;
              seenUrls.add(key);
              merged.push(it);
            }

            // 2) include gallery entries that are not yet synced (preserve external URLs)
            if (allGallery && allGallery.length > 0) {
              for (const g of allGallery) {
                const rawUrl = g.optimized_url || g.url;
                const key = (rawUrl || '').split('?')[0];
                if (!key) continue;
                if (seenUrls.has(key)) continue;
                // If it's synced, prefer optimized_url/path
                if (g.sync_status === 'synced' && g.optimized_url) {
                  merged.push({
                    url: g.optimized_url,
                    path: g.storage_path || null,
                  });
                } else {
                  // pending/external -> keep original url until processed
                  merged.push({ url: g.url, path: null });
                }
                seenUrls.add(key);
              }
            }

            // 3) Fallback: if merged is empty, preserve original product.images if present
            let finalImagesToSave = merged;
            if (
              (!finalImagesToSave || finalImagesToSave.length === 0) &&
              product.images
            ) {
              const arr = Array.isArray(product.images)
                ? product.images
                : [product.images];
              for (const it of arr) {
                if (!it) continue;
                if (typeof it === 'string') {
                  const k = it.split('?')[0];
                  if (!seenUrls.has(k)) {
                    finalImagesToSave.push({ url: it, path: null });
                    seenUrls.add(k);
                  }
                } else if (typeof it === 'object') {
                  const u = it.url || it.path || null;
                  if (u) {
                    const k = String(u).split('?')[0];
                    if (!seenUrls.has(k)) {
                      finalImagesToSave.push({
                        url: String(u),
                        path: it.path || null,
                      });
                      seenUrls.add(k);
                    }
                  }
                }
              }
            }

            await supabase
              .from('products')
              .update({
                sync_status: isOk ? 'synced' : 'failed',
                sync_error: isOk ? null : mainError || 'no_images_found',
                images: finalImagesToSave, // preserve external URLs until internalized
                original_size_kb: Math.round(productOriginalBytes / 1024),
                optimized_size_kb: Math.round(productOptimizedBytes / 1024),
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id);
          } catch (e) {
            console.warn(
              '   ⚠️ Erro ao mesclar imagens para salvar products.images:',
              e.message || e
            );
            // fallback to previous behavior to avoid leaving product in inconsistent state
            await supabase
              .from('products')
              .update({
                sync_status: isOk ? 'synced' : 'failed',
                sync_error: isOk ? null : mainError || 'no_images_found',
                images: imageObjects,
                original_size_kb: Math.round(productOriginalBytes / 1024),
                optimized_size_kb: Math.round(productOptimizedBytes / 1024),
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id);
          }

          // Salva checkpoint local para permitir resume em caso de queda
          try {
            const fs = await import('fs');
            let cp = { processed: [] };
            if (fs.existsSync && fs.existsSync(CHECKPOINT_FILE)) {
              try {
                const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
                cp = JSON.parse(raw || '{"processed":[]}');
              } catch (e) {
                cp = { processed: [] };
              }
            }
            cp.processed = cp.processed || [];
            if (!cp.processed.includes(product.id))
              cp.processed.push(product.id);
            fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp));
          } catch (e) {
            // não bloqueante
          }

          if (isOk) totalProductsSynced++;
          else totalProductsFailed++;
          processedCount++;
          consecutiveErrors = 0; // Reset errors on success
        })
      );
    }

    products.forEach((p) => idsToProcessSet.delete(p.id));
    console.log(`\n⏳ Pausa de segurança (${DELAY_BETWEEN_CHUNKS}ms)...`);
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS));
  }

  // --- RELATÓRIO FINAL ---
  const savedBytes = totalOriginalBytes - totalOptimizedBytes;
  const reduction =
    totalOriginalBytes > 0
      ? ((savedBytes / totalOriginalBytes) * 100).toFixed(1)
      : 0;

  console.log('\n' + '='.repeat(50));
  console.log('🏆 SINCRONIZAÇÃO LOCAL CONCLUÍDA');
  console.log(
    `✅ Sucesso: ${totalProductsSynced} | ❌ Falhas: ${totalProductsFailed}`
  );
  console.log(
    `📉 Redução de Carga: ${reduction}% (${(savedBytes / (1024 * 1024)).toFixed(2)} MB economizados)`
  );
  console.log('='.repeat(50) + '\n');
}

// --- FUNÇÃO DE PROCESSAMENTO (SHARP) ---
async function processAndUpload(
  url,
  storagePath,
  agent,
  targetBucket = BUCKET
) {
  if (!url || url.includes('placeholder')) throw new Error('URL inválida');

  const response = await fetch(url, { agent, timeout: 15000 });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const originalSize = buffer.byteLength;

  // Sharp: Otimização pesada para WebP
  // legacy single-variant upload (kept for compatibility)
  const optimized = await sharp(buffer, { failOn: 'none' })
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  // upload using helper to chosen bucket
  const publicUrl = await uploadToBucket(
    targetBucket,
    storagePath,
    optimized,
    'image/webp'
  );
  return {
    url: publicUrl,
    path: storagePath,
    originalSize,
    optimizedSize: optimized.byteLength,
  };
}

// New: process and upload multiple responsive variants. storageBase is base path (no suffix)
async function processAndUploadVariants(
  url,
  storageBase,
  agent,
  sizes = RESPONSIVE_SIZES,
  targetBucket = BUCKET
) {
  if (!url || url.includes('placeholder')) throw new Error('URL inválida');

  const response = await fetch(url, { agent, timeout: 15000 });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const originalSize = buffer.byteLength;

  const variants = [];
  let optimizedTotal = 0;

  // ensure sizes are unique and sorted
  const uniqueSizes = Array.from(new Set(sizes)).sort((a, b) => a - b);

  // upload variants and keep buffers to avoid re-fetch
  let largestBuf = null;
  for (const s of uniqueSizes) {
    const outBuf = await sharp(buffer, { failOn: 'none' })
      .resize(s, s, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const path = `${storageBase}-${s}w.webp`;
    const urlPublic = await uploadToBucket(
      targetBucket,
      path,
      outBuf,
      'image/webp'
    );
    variants.push({
      size: s,
      path,
      url: urlPublic,
      optimizedSize: outBuf.byteLength,
    });
    optimizedTotal += outBuf.byteLength;
  }

  // Usar maior variante como URL principal (sem criar arquivo duplicado)
  const largest = variants[variants.length - 1];

  return {
    variants,
    main: { size: largest.size, path: largest.path, url: largest.url },
    originalSize,
    optimizedTotal,
  };
}

// Helper: retry operation with exponential backoff
async function retryOperation(fn, attempts = MAX_RETRIES, delayMs = 500) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = delayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

syncFullCatalog()
  .then(() => {
    // Encerrar explicitamente com sucesso para evitar sinais externos
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Erro Fatal:', e);
    // Encerrar com código não-zero para sinalizar falha quando realmente ocorrer
    process.exit(1);
  });
