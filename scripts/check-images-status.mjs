#!/usr/bin/env node
/**
 * Script para verificar o status de internalização das imagens
 * Mostra estatísticas sobre imagens internas vs externas
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error(
    'Configure: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkImagesStatus() {
  console.log('\n🔍 Verificando status das imagens...\n');

  try {
    // 1. Total de produtos
    const { count: totalProducts, error: e1 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (e1) throw e1;

    // 2. Produtos com imagens internalizadas (image_path preenchido)
    const { count: internalized, error: e2 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('image_path', 'is', null);

    if (e2) throw e2;

    // 3. Produtos apenas com URLs externas
    const { count: external, error: e3 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null');

    if (e3) throw e3;

    // 4. Produtos sem imagem nenhuma
    const { count: noImage, error: e4 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('image_path', null)
      .is('external_image_url', null)
      .is('image_url', null);

    if (e4) throw e4;

    // 5. Status da tabela product_images
    const { data: imageStats, error: e5 } = await supabase
      .from('product_images')
      .select('sync_status');

    if (e5) throw e5;

    const statusCount =
      imageStats?.reduce((acc, img) => {
        const status = img.sync_status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};

    // 6. Exemplos de produtos com URLs externas
    const { data: externalSamples, error: e6 } = await supabase
      .from('products')
      .select(
        'id, name, reference_code, brand, image_path, external_image_url, image_url'
      )
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .limit(5);

    if (e6) throw e6;

    // Exibir resultados
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMO DE PRODUTOS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 Total de Produtos: ${totalProducts || 0}`);
    console.log(`✅ Internalizados (image_path): ${internalized || 0}`);
    console.log(`🌐 Apenas URLs Externas: ${external || 0}`);
    console.log(`❌ Sem Imagem: ${noImage || 0}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 STATUS DA GALERIA (product_images)');
    console.log('═══════════════════════════════════════════════════════');
    if (Object.keys(statusCount).length > 0) {
      Object.entries(statusCount).forEach(([status, count]) => {
        const icon =
          status === 'done'
            ? '✅'
            : status === 'pending'
              ? '⏳'
              : status === 'failed'
                ? '❌'
                : '❓';
        console.log(`${icon} ${status}: ${count}`);
      });
    } else {
      console.log('ℹ️  Nenhuma imagem na galeria');
    }
    console.log('');

    if (externalSamples && externalSamples.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔗 EXEMPLOS DE PRODUTOS COM URLS EXTERNAS');
      console.log('═══════════════════════════════════════════════════════');
      externalSamples.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.name} (${p.brand || 'Sem marca'})`);
        console.log(`   Ref: ${p.reference_code || 'N/A'}`);
        console.log(`   ID: ${p.id}`);
        if (p.external_image_url) {
          console.log(
            `   🌐 External: ${p.external_image_url.substring(0, 60)}...`
          );
        }
        if (p.image_url) {
          console.log(`   🌐 Image URL: ${p.image_url.substring(0, 60)}...`);
        }
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 RECOMENDAÇÕES');
    console.log('═══════════════════════════════════════════════════════');

    if (external && external > 0) {
      console.log(
        '⚠️  Há produtos com URLs externas que podem falhar na geração de PDF'
      );
      console.log('');
      console.log(
        '✅ O sistema de PROXY está ativo e resolve o problema de CORS'
      );
      console.log('');
      console.log('📌 Para internalizar essas imagens permanentemente:');
      console.log(
        '   1. Certifique-se que as product_images têm sync_status: "pending"'
      );
      console.log('   2. Execute: pnpm sincronizar');
      console.log('');
      console.log('📌 Para forçar re-sincronização de todas as imagens:');
      console.log('   - Atualize sync_status para "pending" no banco');
      console.log('   - Execute: pnpm sincronizar');
    } else {
      console.log('✅ Todas as imagens estão internalizadas!');
      console.log('✅ A geração de PDF não depende de URLs externas');
    }

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    process.exit(1);
  }
}

checkImagesStatus();
