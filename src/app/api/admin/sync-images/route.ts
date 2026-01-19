import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST() {
  // Use service role for storage operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Busca os produtos pendentes com lógica de prioridade:
  // Prioridade 1: Produtos novos (sync_error é nulo)
  // Prioridade 2: Re-padronização (sync_error contém 'Re-padronização')
  const { data: pendingProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, image_url, name, sync_error')
    .eq('sync_status', 'pending')
    .order('sync_error', { ascending: true, nullsFirst: true }) // NULL (novos) vem primeiro
    .order('created_at', { ascending: false }) // Os mais recentes criados têm preferência
    .limit(25); // Processamos em blocos de 25 para evitar timeout da Vercel/Server

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pendingProducts || pendingProducts.length === 0) {
    return NextResponse.json({ message: 'Nenhuma imagem pendente.' });
  }

  const results = { success: 0, failed: 0 };

  // 2. Loop de processamento (com logs detalhados)
  for (const product of pendingProducts) {
    try {
      console.log(
        `[SYNC-${product.id}] 📥 Iniciando processamento: ${product.name}`
      );

      // Download da imagem bruta (Safilo)
      const response = await fetch(product.image_url, {
        signal: AbortSignal.timeout(45000), // 45 segundos de limite por imagem
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      console.log(
        `[SYNC-${product.id}] 🌐 HTTP Status: ${response.status} ${response.statusText}`
      );
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(
        `[SYNC-${product.id}] 📦 Buffer carregado: ${(buffer.length / 1024).toFixed(2)} KB`
      );

      // Captura tamanho original para métricas de performance
      const originalSizeKb = Math.round(
        parseInt(response.headers.get('content-length') || '0') / 1024
      );

      // Configuração das versões que vamos gerar (Estratégia de Múltiplas Versões)
      const VERSIONS = [
        { suffix: 'small', width: 200, quality: 70 },
        { suffix: 'medium', width: 600, quality: 80 },
        { suffix: 'large', width: 1200, quality: 85 },
      ];

      let mediumBufferSize = 0; // Para capturar o tamanho da versão medium

      // Gerar e enviar as 3 versões
      for (const version of VERSIONS) {
        console.log(
          `[SYNC-${product.id}] 🖼️  Processando versão ${version.suffix} (${version.width}px)...`
        );

        const optimizedBuffer = await sharp(buffer)
          .resize(version.width, version.width, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: version.quality })
          .toBuffer();

        console.log(
          `[SYNC-${product.id}] ✅ Sharp OK - ${version.suffix}: ${(optimizedBuffer.length / 1024).toFixed(2)} KB`
        );

        // Captura tamanho da versão medium para métricas
        if (version.suffix === 'medium') {
          mediumBufferSize = Math.round(optimizedBuffer.length / 1024);
        }

        const fileName = `products/${product.id}-${version.suffix}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, optimizedBuffer, {
            contentType: 'image/webp',
            upsert: true, // Substitui se já existir
          });

        if (uploadError) throw uploadError;
        console.log(
          `[SYNC-${product.id}] ☁️  Upload ${version.suffix}: Sucesso`
        );
      }

      // Pegamos a URL da versão "medium" como padrão para salvar no banco
      const {
        data: { publicUrl },
      } = supabase.storage
        .from('product-images')
        .getPublicUrl(`products/${product.id}-medium.webp`);

      // Atualizamos o banco
      await supabase
        .from('products')
        .update({
          image_url: publicUrl,
          sync_status: 'synced',
          sync_error: null,
          original_size_kb: originalSizeKb,
          optimized_size_kb: mediumBufferSize,
        })
        .eq('id', product.id);

      console.log(
        `[SYNC-${product.id}] 💚 SUCESSO TOTAL - Economia: ${((1 - mediumBufferSize / originalSizeKb) * 100).toFixed(1)}%`
      );
      results.success++;
    } catch (err: any) {
      console.error(`[SYNC-${product.id}] ❌ ERRO:`, err.message);
      console.error(`[SYNC-${product.id}] Stack:`, err.stack);
      const errorMsg = err.message || String(err);
      await supabase
        .from('products')
        .update({
          sync_status: 'failed',
          sync_error: errorMsg,
        })
        .eq('id', product.id);
      results.failed++;
    }
  }

  return NextResponse.json({
    message: 'Processamento concluído',
    detalhes: results,
    errors: pendingProducts
      .filter((p) => p.sync_error)
      .map((p) => ({ id: p.id, name: p.name, error: p.sync_error }))
      .slice(0, 5), // Retorna os primeiros 5 erros para debug
  });
}
