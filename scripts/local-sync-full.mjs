import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import notifier from 'node-notifier'; // Verifique se 'pnpm add node-notifier' foi executado

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'product-images';
const RESPONSIVE_SIZES = [480, 1200];
const CHUNK_SIZE = 8;

function splitUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((i) => splitUrls(i));
  if (typeof input !== 'string') return [];
  return input
    .split(/[;,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'));
}

async function uploadToBucket(path, buf) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { upsert: true, contentType: 'image/webp' });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data?.publicUrl, path };
}

async function processAllVariants(sourceUrl, storageBase, agent) {
  const res = await fetch(sourceUrl, { agent, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const results = [];
  for (const s of RESPONSIVE_SIZES) {
    const outBuf = await sharp(buffer)
      .resize(s, s, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const upload = await uploadToBucket(`${storageBase}-${s}w.webp`, outBuf);
    results.push({ size: s, url: upload.url, path: upload.path });
  }
  return results;
}

async function syncFullCatalog() {
  const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
  const brandFilter = process.argv[2];
  const startTime = Date.now();

  console.log('\n🚀 [RepVendas] Sincronização Iniciada...');

  let query = supabase
    .from('products')
    .select(
      'id, reference_code, image_url, external_image_url, images, brand, sync_status'
    )
    .or('sync_status.eq.pending,sync_status.eq.failed');
  if (brandFilter) query = query.ilike('brand', `%${brandFilter}%`);

  const { data: toProcess } = await query.limit(1000);
  if (!toProcess || toProcess.length === 0) {
    console.log('✅ Nada para sincronizar.');
    return;
  }

  console.log(
    `📦 Marca: ${brandFilter || 'Geral'} | Lote: ${toProcess.length} produtos.`
  );
  console.log('--------------------------------------------------');

  let successCount = 0;

  for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
    const chunk = toProcess.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (product) => {
        const ref = product.reference_code || product.id;
        const brandSlug = String(product.brand || 'geral')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
        const refSafe = String(ref).replace(/[^a-zA-Z0-9]/g, '_');
        const storageBase = `public/brands/${brandSlug}/${refSafe}`;

        try {
          const allUrls = [
            ...new Set([
              ...splitUrls(product.image_url),
              ...splitUrls(product.external_image_url),
              ...splitUrls(product.images),
            ]),
          ];

          if (allUrls.length > 0) {
            let mainVariants = await processAllVariants(
              allUrls[0],
              `${storageBase}-main`,
              agent
            );
            let gallery = [];
            const gUrls = allUrls.slice(1);
            for (let idx = 0; idx < gUrls.length; idx++) {
              try {
                const suffix = String(idx + 2).padStart(2, '0');
                const variants = await processAllVariants(
                  gUrls[idx],
                  `${storageBase}-${suffix}`,
                  agent
                );
                gallery.push({
                  url: variants.find((v) => v.size === 1200).url,
                  path: variants.find((v) => v.size === 1200).path,
                  variants,
                });
              } catch (e) {}
            }

            await supabase
              .from('products')
              .update({
                sync_status: 'synced',
                image_optimized: true,
                image_path: mainVariants.find((v) => v.size === 1200).path,
                image_variants: mainVariants,
                gallery_images: gallery,
                image_url: null,
                external_image_url: null,
                images: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id);

            successCount++;
            console.log(`✅ ${ref} OK.`);
          }
        } catch (err) {
          console.error(`❌ Erro em ${ref}: ${err.message}`);
          await supabase
            .from('products')
            .update({ sync_status: 'failed', sync_error: err.message })
            .eq('id', product.id);
        }
      })
    );
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // --- LOG DE CONCLUSÃO NO TERMINAL ---
  console.log('\n' + '='.repeat(40));
  console.log(`🏆 PROCESSO CONCLUÍDO!`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`⏱️  Tempo Total: ${duration}s`);
  console.log('='.repeat(40) + '\n');

  // 1. Alerta Sonoro do Terminal (Beep)
  process.stdout.write('\x07');

  // 2. Alerta Visual do Windows (Restaurado)
  notifier.notify({
    title: '🚀 RepVendas Sync',
    message: `Finalizado: ${successCount} produtos processados.`,
    sound: true, // Ativa o som da notificação
    wait: false,
    timeout: 10, // Tempo que o alerta fica na tela em segundos
  });
}

syncFullCatalog().catch(console.error);
