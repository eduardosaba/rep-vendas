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

  // 2. Loop de processamento
  for (const product of pendingProducts) {
    try {
      // Download da imagem bruta (Safilo)
      const response = await fetch(product.image_url, {
        signal: AbortSignal.timeout(45000), // 45 segundos de limite por imagem
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());

      // Configuração das versões que vamos gerar (Estratégia de Múltiplas Versões)
      const VERSIONS = [
        { suffix: 'small', width: 200, quality: 70 },
        { suffix: 'medium', width: 600, quality: 80 },
        { suffix: 'large', width: 1200, quality: 85 },
      ];

      // Gerar e enviar as 3 versões
      for (const version of VERSIONS) {
        const optimizedBuffer = await sharp(buffer)
          .resize(version.width, version.width, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: version.quality })
          .toBuffer();

        const fileName = `products/${product.id}-${version.suffix}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, optimizedBuffer, {
            contentType: 'image/webp',
            upsert: true, // Substitui se já existir
          });

        if (uploadError) throw uploadError;
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
        })
        .eq('id', product.id);

      results.success++;
    } catch (err: any) {
      console.error(`Falha no produto ${product.name}:`, err.message);
      await supabase
        .from('products')
        .update({
          sync_status: 'failed',
          sync_error: err.message,
        })
        .eq('id', product.id);
      results.failed++;
    }
  }

  return NextResponse.json({
    message: 'Processamento concluído',
    detalhes: results,
  });
}
