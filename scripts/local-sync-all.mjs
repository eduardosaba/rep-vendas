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
        .select('id, name, image_url')
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

          const optimized = await sharp(buffer)
            .resize(800, 800, { fit: 'inside' })
            .webp({ quality: 80 })
            .toBuffer();

          const path = `products/${product.id}-main.webp`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, optimized, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: publicData } = await supabase.storage
            .from('product-images')
            .getPublicUrl(path);

          const publicUrl =
            publicData?.publicUrl || publicData?.public_url || '';

          await supabase
            .from('products')
            .update({ image_url: publicUrl, sync_status: 'synced' })
            .eq('id', product.id);

          console.log(`✅ ${product.name} - Sincronizado`);
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
