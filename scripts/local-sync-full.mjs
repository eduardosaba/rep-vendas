import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import fs from 'fs';
import pLimit from 'p-limit';
import notifier from 'node-notifier';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'product-images';
const RESPONSIVE_SIZES = [480, 1200];
// Com 400mb de internet, podemos subir para 15 ou 20
const MAX_CONCURRENT = 15;

const limit = pLimit(MAX_CONCURRENT);

function splitUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((i) => splitUrls(i));
  if (typeof input === 'object') {
    // common fields that may hold a url inside gallery objects
    return splitUrls(input.url || input.src || input.path || input.publicUrl || input.public_url || '');
  }
  return String(input)
    .split(/[;,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'));
}

async function processImage(url, storageBase, agent) {
  // Timeout agressivo de 10s para não travar a fila
  const res = await fetch(url, { agent, timeout: 10000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Processa todas as variantes (480 e 1200) em paralelo para o mesmo arquivo
  return Promise.all(
    RESPONSIVE_SIZES.map(async (size) => {
      const outBuf = await sharp(buffer)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
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
  // Aumentamos maxSockets para o 4G de 400mb respirar
  const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 50,
    scheduling: 'lifo',
  });

  // CLI args: [brandFilter] or flags: --dry-run, --ids=id1,id2
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
    `\n🚀 [RepVendas] MODO TURBO ATIVADO (Concorrência: ${MAX_CONCURRENT})`.bold
  );

  let query;
  if (targetIds && targetIds.length) {
    query = supabase.from('products').select('id, reference_code, image_url, external_image_url, images, brand').in('id', targetIds);
  } else {
    query = supabase
      .from('products')
      .select('id, reference_code, image_url, external_image_url, images, brand')
      .or('sync_status.eq.pending,sync_status.eq.failed');

    if (brandFilter) query = query.ilike('brand', `%${brandFilter}%`);
  }

  const { data, error } = await query.limit(1000);
  if (error || !data) {
    console.error('❌ Erro Supabase:', error?.message);
    return;
  }

  console.log(`📦 Processando lote de ${data.length} itens...`);

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
          if (dryRun) {
            // In dry-run we only check availability of the URLs and record results
            const checks = await Promise.all(
              urls.map(async (u) => {
                try {
                  const r = await fetch(u, { agent, timeout: 10000 });
                  return { url: u, ok: r.ok, status: r.status };
                } catch (e) {
                  return { url: u, ok: false, error: e.message };
                }
              })
            );
            // store dry-run info globally to write file after the run
            if (!global.__dryRunReport) global.__dryRunReport = [];
            global.__dryRunReport.push({ id: product.id, reference: ref, checks });
            processed++;
            process.stdout.write(
              `\r[D-RUN] Verificados: ${processed}/${data.length} | Atual: ${ref}          `
            );
            return;
          }
          // Processa Capa
          const mainVariants = await processImage(
            urls[0],
            `${storagePath}-main`,
            agent
          );

          // Processa Galeria em lote interno também
          const gallery = [];
          const galleryUrls = urls.slice(1);
          await Promise.all(
            galleryUrls.map(async (gUrl, idx) => {
              try {
                const v = await processImage(
                  gUrl,
                  `${storagePath}-${idx + 2}`,
                  agent
                );
                gallery.push({
                  url: v.find((img) => img.size === 1200).url,
                  path: v.find((img) => img.size === 1200).path,
                  variants: v,
                });
              } catch (e) {}
            })
          );

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
        // Log minimalista para não travar o buffer do terminal
        process.stdout.write(
          `\r✅ Processados: ${processed}/${data.length} | Atual: ${ref}          `
        );
      } catch (err) {
        processed++;
        console.error(`\n❌ Erro em ${ref}: ${err.message}`);
        await supabase
          .from('products')
          .update({ sync_status: 'failed', sync_error: err.message })
          .eq('id', product.id);
      }
    })
  );

  await Promise.all(tasks);

  // If we ran in dry-run mode, dump the report and exit before doing RPC/notifications
  if (dryRun) {
    const outPath = `./sync-dryrun-report-${Date.now()}.json`;
    try {
      fs.writeFileSync(outPath, JSON.stringify(global.__dryRunReport || [], null, 2));
      console.log(`\n✅ Dry-run report salvo em ${outPath}`);
    } catch (e) {
      console.error('❌ Falha ao salvar dry-run report:', e.message || e);
    }
    return;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🏆 Finalizado! ${processed} itens em ${duration}s.`);
  process.stdout.write('\x07');
  // Limpeza de metadados (Gênero/Tipo) via RPC - permite reindexar filtros após o sync
  const USER_ID = process.env.USER_ID || process.env.SUPABASE_USER_ID || null;
  console.log('🧹 Limpando metadados (Gênero/Tipo)...');
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'sync_all_product_filters',
      { p_user_id: USER_ID }
    );
    if (rpcError)
      console.error('❌ RPC sync_all_product_filters falhou:', rpcError);
    else console.log('✅ RPC sync_all_product_filters concluído');
  } catch (e) {
    console.error(
      '❌ Erro ao chamar RPC sync_all_product_filters:',
      e.message || e
    );
  }

  notifier.notify({
    title: 'RepVendas Turbo',
    message: `Concluído em ${duration}s.`,
  });
}

syncFullCatalog().catch(console.error);
