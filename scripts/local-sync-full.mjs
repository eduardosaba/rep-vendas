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

  let allIds = Array.from(idsToProcessSet);
  let totalToProcess = allIds.length;

  while (true) {
    allIds = Array.from(idsToProcessSet).filter((id) => !processedIds.has(id));
    if (allIds.length === 0) break;

    const nextBatchIds = allIds.slice(0, CHUNK_SIZE);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, reference_code, image_url, sync_status, images')
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
          if (product.sync_status !== 'synced' && product.image_url) {
            try {
              const storagePath = `products/${product.id}-main.webp`;
              const res = await processAndUpload(
                product.image_url,
                storagePath,
                agent
              );

              // ATUALIZAÇÃO COMPATÍVEL COM ESTRATÉGIA RESILIENTE
              await supabase
                .from('products')
                .update({
                  image_url: res.url, // URL pública
                  image_path: storagePath, // NOVO: Path interno
                  image_optimized: true, // NOVO: Ativa selo verde
                })
                .eq('id', product.id);

              totalOriginalBytes += res.originalSize;
              totalOptimizedBytes += res.optimizedSize;
              productOriginalBytes += res.originalSize;
              productOptimizedBytes += res.optimizedSize;
              mainSuccess = true;
              console.log('   ✅ Capa Otimizada');
            } catch (err) {
              mainError = String(err?.message || err);
              console.error(`   ❌ Capa: ${mainError}`);
            }
          }

          // 2. PROCESSAR GALERIA SECUNDÁRIA
          let gallerySynced = 0;
          try {
            const { data: gallery } = await supabase
              .from('product_images')
              .select('id, url')
              .eq('product_id', product.id)
              .neq('sync_status', 'synced');

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

                      const gPath = `products/gallery/${img.id}.webp`;
                      const res = await processAndUpload(
                        cleanUrl,
                        gPath,
                        agent
                      );

                      await supabase
                        .from('product_images')
                        .update({
                          optimized_url: res.url,
                          storage_path: gPath, // Garantindo o path na tabela auxiliar
                          sync_status: 'synced',
                        })
                        .eq('id', img.id);

                      totalOriginalBytes += res.originalSize;
                      totalOptimizedBytes += res.optimizedSize;
                      productOriginalBytes += res.originalSize;
                      productOptimizedBytes += res.optimizedSize;
                      gallerySynced++;
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
          const isOk = mainSuccess || gallerySynced > 0;

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

          await supabase
            .from('products')
            .update({
              sync_status: isOk ? 'synced' : 'failed',
              sync_error: isOk ? null : mainError || 'no_images_found',
              images: imageObjects, // NOVO: Converte array de strings para array de OBJETOS
              original_size_kb: Math.round(productOriginalBytes / 1024),
              optimized_size_kb: Math.round(productOptimizedBytes / 1024),
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

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
async function processAndUpload(url, storagePath, agent) {
  if (!url || url.includes('placeholder')) throw new Error('URL inválida');

  const response = await fetch(url, { agent, timeout: 15000 });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const originalSize = buffer.byteLength;

  // Sharp: Otimização pesada para WebP
  const optimized = await sharp(buffer, { failOn: 'none' })
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

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
  return {
    url: data.publicUrl,
    path: storagePath,
    originalSize,
    optimizedSize: optimized.byteLength,
  };
}

syncFullCatalog().catch((e) => {
  console.error('❌ Erro Fatal:', e);
  process.exitCode = 0;
});
