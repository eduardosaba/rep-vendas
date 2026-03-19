import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Resolve SUPABASE URL/KEY from env with sensible fallbacks
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error(
    'FATAL: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required in environment.'
  );
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error(
    'FATAL: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY) is required in environment.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 20; // Lote por ciclo
const DELAY_BETWEEN_CHUNKS = Number(process.env.DELAY_BETWEEN_CHUNKS) || 2000; // ms

async function startMassiveSync() {
  const agent = new https.Agent({ rejectUnauthorized: false }); // Uso local para bypass TLS quando necessário

  console.log('🚀 [RepVendas] Iniciando Sincronização em Massa...');

  while (true) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image_url, reference_code, brand, color')
        .eq('sync_status', 'pending')
        .limit(CHUNK_SIZE);

      if (error) {
        console.error('❌ Erro ao buscar dados:', error.message || error);
        break;
      }

      if (!products || products.length === 0) {
        console.log('✨ FIM! Todos os produtos foram sincronizados.');
        break;
      }

      console.log(`\n📦 Processando lote de ${products.length} itens...`);

      for (const product of products) {
        try {
          if (!product?.image_url) {
            const message = 'missing image_url';
            console.error(`⚠️ Falha em ${product.name}: ${message}`);
            try {
              await supabase
                .from('products')
                .update({ sync_status: 'failed', sync_error: message })
                .eq('id', product.id);
            } catch (e) {}
            continue;
          }
          const response = await fetch(product.image_url, {
            agent,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://commportal-images.safilo.com/',
            },
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const buffer = Buffer.from(await response.arrayBuffer());

          // build brand/ref based storage base
          const brand = product.brand || 'Geral';
          const ref = product.reference_code || product.id;
          const color = product.color || '';
          const refSafe = String(ref).replace(/[^a-zA-Z0-9]/g, '_');
          const colorSlugRaw = String(color || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const refNorm = refSafe.toLowerCase().replace(/[_]+/g, '-');
          const includeColor = colorSlugRaw && !refNorm.endsWith('-' + colorSlugRaw) && !refNorm.endsWith(colorSlugRaw);
          const brandSlug = String(brand || 'geral').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const fileBase = includeColor
            ? `public/brands/${brandSlug}/${refSafe}-${colorSlugRaw}-main`
            : `public/brands/${brandSlug}/${refSafe}-main`;

          // create two responsive variants (480 and 1200) for main image
          const variants = [];
          const sizes = [{ size: 480, width: 480, quality: 70 }, { size: 1200, width: 1200, quality: 85 }];
          for (const s of sizes) {
            const out = await sharp(buffer)
              .resize({ width: s.width, withoutEnlargement: true })
              .webp({ quality: s.quality })
              .toBuffer();
            const path = `${fileBase}-${s.size}w.webp`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(path, out, { upsert: true, contentType: 'image/webp' });
            if (uploadError) throw uploadError;
            const { data: publicData } = await supabase.storage.from('product-images').getPublicUrl(path);
            const publicUrl = publicData?.publicUrl || publicData?.public_url || '';
            variants.push({ size: s.size, url: publicUrl, path });
          }

          // process gallery images if present in product.images (skip first if it's the cover)
          const gallery = [];
          try {
            let galleryUrls = [];
            if (Array.isArray(product.images)) galleryUrls = product.images.filter(Boolean);
            else if (typeof product.images === 'string') galleryUrls = product.images.split(/[;,]/).map(s => s.trim()).filter(Boolean);

            // if first url is same as image_url, drop it
            if (galleryUrls.length && product.image_url && galleryUrls[0] === product.image_url) galleryUrls = galleryUrls.slice(1);

            for (let idx = 0; idx < galleryUrls.length; idx++) {
              const gUrl = galleryUrls[idx];
              const indexPad = String(idx + 1).padStart(2, '0');
              const fileBaseGallery = includeColor
                ? `public/brands/${brandSlug}/${refSafe}-${colorSlugRaw}-${indexPad}`
                : `public/brands/${brandSlug}/${refSafe}-${indexPad}`;
              const gVariants = [];
              for (const s of sizes) {
                try {
                  const respBuf = Buffer.from(await (await fetch(gUrl, { agent })).arrayBuffer());
                  const out = await sharp(respBuf)
                    .resize({ width: s.width, withoutEnlargement: true })
                    .webp({ quality: s.quality })
                    .toBuffer();
                  const path = `${fileBaseGallery}-${s.size}w.webp`;
                  const { error: uploadError } = await supabase.storage.from('product-images').upload(path, out, { upsert: true, contentType: 'image/webp' });
                  if (uploadError) throw uploadError;
                  const { data: publicData } = await supabase.storage.from('product-images').getPublicUrl(path);
                  const publicUrl = publicData?.publicUrl || publicData?.public_url || '';
                  gVariants.push({ size: s.size, url: publicUrl, path });
                } catch (e) {
                  // ignore per-image failures and continue
                }
              }
              if (gVariants.length) gallery.push({ url: gVariants.find(v => v.size === 1200)?.url || gVariants[0].url, path: gVariants.find(v => v.size === 1200)?.path || gVariants[0].path, variants: gVariants });
            }
          } catch (e) {
            // don't fail the whole product if gallery processing errors
          }

          // update product: set image_path to 1200w path and image_variants array, and gallery_images
          await supabase
            .from('products')
            .update({ image_url: null, image_path: variants.find(v => v.size === 1200).path, image_variants: variants, gallery_images: gallery, sync_status: 'synced' })
            .eq('id', product.id);

          console.log(`✅ ${product.name} - Sincronizado (brands path)`);
        } catch (err) {
          const message = err?.message || String(err);
          console.error(`⚠️ Falha em ${product.name}: ${message}`);
          try {
            await supabase
              .from('products')
              .update({ sync_status: 'failed', sync_error: message })
              .eq('id', product.id);
          } catch (e) {}
        }
      }

      console.log(
        `⏳ Aguardando ${DELAY_BETWEEN_CHUNKS / 1000}s para o próximo lote...`
      );
      await new Promise((res) => setTimeout(res, DELAY_BETWEEN_CHUNKS));
    } catch (outerErr) {
      console.error('Erro inesperado no loop principal:', outerErr);
      break;
    }
  }
}

startMassiveSync().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
