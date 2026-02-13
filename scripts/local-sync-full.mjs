import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import pLimit from 'p-limit';
import notifier from 'node-notifier';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'product-images';
const RESPONSIVE_SIZES = [480, 1200];

// --- CONFIGURAÇÕES PARA NOTEBOOK / INTERNET LENTA ---
const MAX_CONCURRENT = 2; // Apenas 2 produtos por vez para não travar o 2G
const QUALITY = 60; // Imagens ultra-leves para upload rápido
const TIMEOUT = 60000; // 60 segundos (paciência com o download lento)

const limit = pLimit(MAX_CONCURRENT);

function splitUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((i) => splitUrls(i));
  return String(input)
    .split(/[;,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'));
}

async function processImage(url, storageBase, agent) {
  // Timeout estendido para conexões instáveis
  const res = await fetch(url, { agent, timeout: TIMEOUT });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const variants = [];
  // Processamento sequencial das variantes para poupar a CPU do notebook
  for (const size of RESPONSIVE_SIZES) {
    const outBuf = await sharp(buffer)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    const path = `${storageBase}-${size}w.webp`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, outBuf, { upsert: true, contentType: 'image/webp' });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    variants.push({ size, url: data.publicUrl, path });
  }
  return variants;
}

async function syncFullCatalog() {
  const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 5, // Poucas conexões para não "afogar" o roteador
  });

  const brandFilter = process.argv[2];
  const startTime = Date.now();

  console.log(
    `\n💻 [RepVendas] Modo Notebook Ativado (Estabilidade > Velocidade)`.yellow
  );

  let query = supabase
    .from('products')
    .select('id, reference_code, image_url, external_image_url, images, brand')
    .or('sync_status.eq.pending,sync_status.eq.failed');

  if (brandFilter) query = query.ilike('brand', `%${brandFilter}%`);

  const { data, error } = await query.limit(500); // Lote menor para controle
  if (error || !data) {
    console.error('❌ Erro Supabase:', error?.message);
    return;
  }

  console.log(`📦 Processando ${data.length} itens no 2G...`);
  console.log('--------------------------------------------------');

  let processed = 0;

  const tasks = data.map((product) =>
    limit(async () => {
      const brand = product.brand || 'Geral';
      const ref = product.reference_code || product.id;
      const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
      const refSafe = String(ref).replace(/[^a-zA-Z0-9]/g, '_');
      const storagePath = `public/brands/${brandSlug}/${refSafe}`;

      try {
        const urls = [
          ...new Set([
            ...splitUrls(product.image_url),
            ...splitUrls(product.external_image_url),
            ...splitUrls(product.images),
          ]),
        ];

        if (urls.length > 0) {
          // Processa Capa
          const mainVariants = await processImage(
            urls[0],
            `${storagePath}-main`,
            agent
          );

          // Processa Galeria um por um para não estourar o upload
          const gallery = [];
          const galleryUrls = urls.slice(1);
          for (let idx = 0; idx < galleryUrls.length; idx++) {
            try {
              const v = await processImage(
                galleryUrls[idx],
                `${storagePath}-${idx + 2}`,
                agent
              );
              gallery.push({
                url: v.find((img) => img.size === 1200).url,
                path: v.find((img) => img.size === 1200).path,
                variants: v,
              });
            } catch (e) {}
          }

          await supabase
            .from('products')
            .update({
              sync_status: 'synced',
              image_path: mainVariants.find((v) => v.size === 1200).path,
              image_variants: mainVariants,
              gallery_images: gallery,
              image_url: null,
              external_image_url: null,
              images: null,
              image_optimized: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);
        } else {
          await supabase
            .from('products')
            .update({ sync_status: 'synced', sync_error: 'Sem URLs' })
            .eq('id', product.id);
        }

        processed++;
        console.log(`[${processed}/${data.length}] ✅ ${brand} - ${ref} OK.`);
      } catch (err) {
        processed++;
        console.error(
          `[${processed}/${data.length}] ❌ Erro em ${ref}: ${err.message}`
        );
        await supabase
          .from('products')
          .update({ sync_status: 'failed', sync_error: err.message })
          .eq('id', product.id);
      }
    })
  );

  await Promise.all(tasks);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🏆 Finalizado no Notebook em ${duration}s.`);
  process.stdout.write('\x07');
  notifier.notify({
    title: 'RepVendas Notebook',
    message: `Concluído: ${processed} itens.`,
  });
}

syncFullCatalog().catch(console.error);
