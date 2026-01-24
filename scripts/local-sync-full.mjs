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

  // Busca contagem inicial para o progresso
  let { count: totalToProcess } = await supabase
    .from('products')
    .select('id', { head: true, count: 'exact' })
    .in('sync_status', SYNC_ONLY);

  while (true) {
    try {
      // Busca apenas IDs que ainda não tentamos nesta sessão para evitar loops
      const processedArray = Array.from(processedIds).slice(-100);
      let query = supabase
        .from('products')
        .select('id, name, reference_code, image_url, sync_status')
        .in('sync_status', SYNC_ONLY);

      if (processedArray.length > 0) {
        query = query.not('id', 'in', `(${processedArray.join(',')})`);
      }

      const { data: products, error } = await query.limit(CHUNK_SIZE);

      if (error) throw error;
      if (!products || products.length === 0) break;

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
                mainError = err.message;
                console.error(`   ❌ Capa: ${mainError}`);
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
                        await supabase
                          .from('product_images')
                          .update({
                            sync_status: 'failed',
                            sync_error: err.message,
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

      console.log(`\n⏳ Pausa para respiro (${DELAY_BETWEEN_CHUNKS}ms)...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS));
    } catch (err) {
      console.error('🚨 Erro Crítico:', err.message);
      break;
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

  const response = await fetch(url, {
    agent,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

syncFullCatalog().catch((e) => console.error('❌ Erro Fatal:', e));
