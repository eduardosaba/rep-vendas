import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';
import sharp from 'sharp';

/**
 * 1. BLINDAGEM DE PROTOCOLO (ESSENCIAL PARA NODE 22)
 * Força o sistema a usar IPv4 primeiro. Isso resolve 90% dos erros 'fetch failed'.
 */
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * 2. BYPASS DE SSL
 * Alguns portais (Safilo, Luxottica) têm certificados que o Node 22 rejeita por padrão.
 * Ativamos o bypass apenas em desenvolvimento para garantir o download.
 */
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Service Key ausente nas variáveis de ambiente.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json(
        { error: 'Dados incompletos.' },
        { status: 400 }
      );
    }

    targetUrl = encodeURI(externalUrl.trim());

    // Recupera dados do produto
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('user_id, brand')
      .eq('id', productId)
      .maybeSingle();

    if (!product) throw new Error('Produto não encontrado.');

    /**
     * 3. FETCH COM CABEÇALHOS DE NAVEGADOR REAL
     * Adicionamos referer e disfarce completo para evitar bloqueios de firewall.
     */
    console.log(`[SYNC] Tentando download: ${targetUrl}`);

    const downloadResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://commportal.safilo.com/',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      // Aumentamos o timeout para 45 segundos para conexões lentas
      signal: AbortSignal.timeout(45000),
    });

    if (!downloadResponse.ok) {
      throw new Error(
        `Servidor externo retornou erro ${downloadResponse.status}`
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // 4. OTIMIZAÇÃO SHARP
    const optimizedBuffer = await sharp(originalBuffer, { failOn: 'none' })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true, mozjpeg: true })
      .toBuffer();

    // 5. UPLOAD PARA STORAGE
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${product.user_id}/products/${brandFolder}/${productId}-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw new Error(`Erro no Storage: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    // 6. ATUALIZAÇÃO DO BANCO
    await supabaseAdmin
      .from('products')
      .update({
        image_path: uploadData.path,
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error(`[SYNC ERROR] ${targetUrl}:`, error.message);

    // Retorna erro amigável para o Dashboard
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        cause: error.cause?.code || 'FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
