import fs from 'fs';
import dns from 'node:dns';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

// Carrega as variáveis do seu .env.local
dotenv.config({ path: '.env.local' });

// 1. CONFIGURAÇÃO DE AMBIENTE (Igual ao seu teste que funcionou)
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
// Apenas habilite TLS inseguro em execução local definindo ALLOW_INSECURE_TLS=1
// e somente quando não estivermos em `production`.
if (process.env.ALLOW_INSECURE_TLS === '1') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'ALLOW_INSECURE_TLS=1 detected — enabling insecure TLS for local testing'
    );
    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    } catch (e) {
      // ignore
    }
  } else {
    console.warn('ALLOW_INSECURE_TLS is set but ignored in production environment');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use a Service Role para ignorar travas
);

const limit = pLimit(3); // Processa 3 imagens por vez (seguro para não ser bloqueado)

async function processProduct(product) {
  const targetUrl = product.external_image_url;
  if (!targetUrl) return;

  console.log(`⏳ Processando [${product.brand}]: ${product.name}...`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://commportal.safilo.com/',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // OTIMIZAÇÃO COM SHARP
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const fileName = `public/${product.user_id}/products/${product.id}-${Date.now()}.jpg`;

    // UPLOAD PARA STORAGE
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // URL PÚBLICA
    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(fileName);

    // ATUALIZA BANCO DE DADOS
    const { error: updateError } = await supabase
      .from('products')
      .update({
        image_path: fileName,
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);

    if (updateError) throw updateError;

    console.log(`✅ Sucesso: ${product.name}`);
  } catch (error) {
    console.error(`❌ Erro em ${product.name}: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Iniciando Sincronização Global...');

  // Busca produtos que ainda não foram internalizados (image_path nulo)
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .is('image_path', null)
    .not('external_image_url', 'is', null);

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  console.log(`📦 Encontrados ${products.length} produtos para processar.`);

  const tasks = products.map((product) => limit(() => processProduct(product)));
  await Promise.all(tasks);

  console.log('🏁 Sincronização finalizada!');
}

main();
