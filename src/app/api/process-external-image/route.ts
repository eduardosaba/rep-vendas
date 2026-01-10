import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';
import sharp from 'sharp';

/**
 * 1. CONFIGURAÇÕES DE PROTOCOLO E SEGURANÇA
 * Força IPv4 para evitar erros de 'fetch failed' e ignora SSL em dev.
 */
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para processar imagens pesadas

/**
 * Utilitário para organizar pastas no Storage
 */
function sanitizeFolder(name: string | null | undefined) {
  if (!name) return 'geral';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
}

export async function POST(request: Request) {
  let targetUrl = '';

  try {
    // 2. CONFIGURAÇÃO DO CLIENTE ADMIN (Service Role para ignorar RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Configuração de servidor incompleta (Service Key ausente).'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. VALIDAÇÃO DO CORPO DA REQUISIÇÃO
    const body = await request.json();
    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json(
        { error: 'ID do produto ou URL ausente.' },
        { status: 400 }
      );
    }

    targetUrl = encodeURI(externalUrl.trim());

    // 4. RECUPERA DADOS PARA ORGANIZAÇÃO DE PASTAS
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('user_id, brand')
      .eq('id', productId)
      .maybeSingle();

    if (fetchError || !product) {
      throw new Error('Produto não encontrado no banco de dados.');
    }

    // 5. DOWNLOAD DA IMAGEM (Disfarce de Navegador para Safilo/Boss/Tommy)
    const downloadResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://commportal.safilo.com/', // Referer crucial para grandes portais
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(40000), // 40 segundos de timeout
    });

    if (!downloadResponse.ok) {
      throw new Error(
        `Falha no download (${downloadResponse.status}): Servidor externo recusou.`
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // 6. OTIMIZAÇÃO COM SHARP (Qualidade Profissional para Óptica)
    let optimizedBuffer: Buffer;
    const extension = 'jpg';

    try {
      optimizedBuffer = await sharp(originalBuffer, { failOn: 'none' })
        .rotate() // Corrige orientação da foto
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    } catch (sharpError: any) {
      console.warn('Sharp falhou, usando buffer original:', sharpError.message);
      optimizedBuffer = originalBuffer;
    }

    // 7. DEFINIÇÃO DO CAMINHO E UPLOAD (Bucket: product-images)
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${product.user_id}/products/${brandFolder}/${productId}-${Date.now()}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000',
      });

    if (uploadError) throw new Error(`Erro no Storage: ${uploadError.message}`);

    // 8. GERAÇÃO DE URL PÚBLICA
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData?.publicUrl;

    // 9. ATUALIZAÇÃO DO BANCO DE DADOS
    const { error: dbError } = await supabaseAdmin
      .from('products')
      .update({
        image_path: uploadData.path,
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (dbError) throw new Error(`Erro ao atualizar banco: ${dbError.message}`);

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error(`[SYNC FAILURE]`, error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro inesperado.',
        details:
          error.cause?.message || 'Verifique se a URL da imagem é válida.',
      },
      { status: 500 }
    );
  }
}
