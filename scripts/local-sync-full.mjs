import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import pLimit from 'p-limit';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'product-images';
const RESPONSIVE_SIZES = [480, 1200];
const SIZE_OPTIONS = {
  480: { width: 480, quality: 70 },
  1200: { width: 1200, quality: 85 },
};
const MAX_CONCURRENT = 15;
const limit = pLimit(MAX_CONCURRENT);

function splitUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((i) => splitUrls(i));
  if (typeof input === 'object') {
    return splitUrls(input.url || input.src || input.path || input.publicUrl || input.public_url || '');
  }
  return String(input)
    .split(/[;,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'));
}

async function fetchWithRetry(url, agent, retries = 3) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { agent, headers, timeout: 15000 });
      if (res.ok) return res;
      if (res.status === 404) throw new Error(`HTTP 404 (Imagem não encontrada)`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Falha ao baixar imagem após ${retries} tentativas`);
}

async function processImage(url, storageBase, agent) {
  const res = await fetchWithRetry(url, agent);
  const buffer = Buffer.from(await res.arrayBuffer());

  return Promise.all(
    RESPONSIVE_SIZES.map(async (size) => {
      const outBuf = await sharp(buffer)
        .resize({ width: SIZE_OPTIONS[size].width, withoutEnlargement: true })
        .webp({ quality: SIZE_OPTIONS[size].quality })
        .toBuffer();

      const path = `${storageBase}-${size}w.webp`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, outBuf, { upsert: true, contentType: 'image/webp' });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { size, url: data.publicUrl, path };
    })
  );
}

async function syncFullCatalog() {
  const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 50,
    scheduling: 'lifo',
  });

  const rawArgs = process.argv.slice(2);
  let brandFilter = null;
  let dryRun = false;
  let targetIds = null;
  for (const a of rawArgs) {
    if (a === '--dry-run') dryRun = true;
    else if (a.startsWith('--ids=')) targetIds = a.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
    else if (!brandFilter) brandFilter = a;
  }
  const startTime = Date.now();

  console.log(
    `\n🚀 [RepVendas Turbo v2] MODO INTELIGENTE ATIVADO (Concorrência: ${MAX_CONCURRENT})`
  );

  let totalProcessedInRun = 0;

  while (true) {
    let query;
    if (targetIds && targetIds.length) {
      query = supabase.from('products').select('id, reference_code, image_url, external_image_url, images, brand, color, gallery_images').in('id', targetIds);
    } else {
      // Query inteligente: pega pendentes, failed OU qualquer item com image_path NULL que possua URLs externas
      query = supabase
        .from('products')
        .select('id, reference_code, image_url, external_image_url, images, brand, color, gallery_images')
        .is('image_path', null)
        .or('external_image_url.not.is.null,image_url.not.is.null,images.not.is.null');

      if (brandFilter) query = query.ilike('brand', `%${brandFilter}%`);
    }

    const { data, error } = await query.limit(500);
    if (error) {
      console.error('❌ Erro Supabase:', error?.message);
      break;
    }

    if (!data || data.length === 0) {
      if (totalProcessedInRun === 0) {
        console.log(`✨ Nenhum produto pendente para sincronizar ${brandFilter ? `na marca "${brandFilter}"` : ''}.`);
      } else {
        console.log(`\n🏆 Todos os lotes foram processados com sucesso! Total: ${totalProcessedInRun} produtos.`);
      }
      break;
    }

    console.log(`📦 Processando lote de ${data.length} itens...`);
    let processedInBatch = 0;

    const tasks = data.map((product) =>
      limit(async () => {
        const brand = product.brand || 'Geral';
        const ref = product.reference_code || product.id;
        const color = product.color || '';
        const refSafe = String(ref).replace(/[^a-zA-Z0-9]/g, '_');
        const colorSlugRaw = String(color || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const refNorm = refSafe.toLowerCase().replace(/[_]+/g, '-');
        const includeColor = colorSlugRaw && !refNorm.endsWith('-' + colorSlugRaw) && !refNorm.endsWith(colorSlugRaw);
        const brandSlug = String(brand || 'geral').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const fileBase = includeColor
          ? `public/brands/${brandSlug}/${refSafe}-${colorSlugRaw}`
          : `public/brands/${brandSlug}/${refSafe}`;

        try {
          const urls = [
            ...new Set([
              ...splitUrls(product.image_url),
              ...splitUrls(product.external_image_url),
              ...splitUrls(product.images),
              ...splitUrls(product.gallery_images),
            ]),
          ];

          if (urls.length > 0) {
            if (dryRun) {
              processedInBatch++;
              totalProcessedInRun++;
              process.stdout.write(`\r[D-RUN] Verificados: ${totalProcessedInRun} | Atual: ${ref}          `);
              return;
            }

            // 1. Processa Capa
            const mainVariants = await processImage(urls[0], fileBase, agent);
            const main1200Path = mainVariants.find((v) => v.size === 1200).path;

            // 2. Processa Galeria
            const gallery = [];
            const galleryUrls = urls.slice(1);
            await Promise.all(
              galleryUrls.map(async (gUrl, idx) => {
                try {
                  const indexPad = String(idx + 1).padStart(2, '0');
                  const v = await processImage(gUrl, `${fileBase}-${indexPad}`, agent);
                  gallery.push({
                    url: v.find((img) => img.size === 1200).url,
                    path: v.find((img) => img.size === 1200).path,
                    variants: v,
                  });
                } catch (e) {}
              })
            );

            const updatePayload = {
              sync_status: 'synced',
              image_path: main1200Path,
              image_variants: mainVariants,
              gallery_images: gallery,
              image_url: null,
              external_image_url: null,
              images: null,
              image_optimized: true,
              sync_error: null,
              updated_at: new Date().toISOString(),
            };

            // 3. Atualiza produto modelo/template
            await supabase.from('products').update(updatePayload).eq('id', product.id);

            // 4. Replica instantaneamente para todos os produtos clonados em outras contas
            await supabase
              .from('products')
              .update(updatePayload)
              .or(`original_product_id.eq.${product.id},source_product_id.eq.${product.id}`);

          } else {
            await supabase
              .from('products')
              .update({ sync_status: 'synced', sync_error: 'Sem URLs externas' })
              .eq('id', product.id);
          }

          processedInBatch++;
          totalProcessedInRun++;
          process.stdout.write(
            `\r✅ Processados: ${totalProcessedInRun} | Atual: ${ref}          `
          );
        } catch (err) {
          processedInBatch++;
          totalProcessedInRun++;
          console.error(`\n❌ Erro em ${ref}: ${err.message}`);
          await supabase
            .from('products')
            .update({ sync_status: 'failed', sync_error: err.message })
            .eq('id', product.id);
        }
      })
    );

    await Promise.all(tasks);

    // Se estivermos em targetIds específico ou dry-run, rodar 1 única vez
    if (targetIds && targetIds.length) break;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🏆 Finalizado! ${totalProcessedInRun} itens em ${durationSec}s.`);

  // Sincronizar filtros RPC
  try {
    console.log('🧹 Limpando metadados e sincronizando filtros (Gênero/Tipo)...');
    await supabase.rpc('sync_all_product_filters');
    console.log('✅ RPC sync_all_product_filters concluído com sucesso!');
  } catch (e) {
    console.warn('Aviso RPC:', e.message);
  }
}

syncFullCatalog();
