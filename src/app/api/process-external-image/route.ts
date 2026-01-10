import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';
import sharp from 'sharp';

// 1. Força IPv4 para evitar erros de conexão (comum em redes locais e Docker)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * 2. TRATAMENTO DO SSL/TLS
 * Permitir download de sites com SSL inválido apenas em DESENVOLVIMENTO.
 * Para ativar localmente, adicione ALLOW_INSECURE_TLS=1 no seu .env.local
 */
if (
  process.env.NODE_ENV === 'development' &&
  process.env.ALLOW_INSECURE_TLS === '1'
) {
  // Evita re-setar se já estiver como '0' para não poluir o terminal
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log(
      '⚠️ [SECURITY] Verificação TLS desativada para processamento de imagens externas.'
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // Aumentado para lidar com imagens pesadas

// Função para limpar nomes de pasta (Ex: "Ray-Ban" -> "ray-ban")
function sanitizeFolder(name: string | null | undefined) {
  if (!name) return 'geral';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Substitui símbolos por traço
    .replace(/-+/g, '-'); // Remove traços repetidos
}

export async function POST(request: Request) {
  let targetUrl = '';

  try {
    // 1. Configuração do Cliente Admin (Service Role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração de servidor incompleta (Service Key ausente).' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Recebe e valida os dados do body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[PARSE ERROR]', parseError);
      return NextResponse.json(
        {
          error: 'JSON inválido no corpo da requisição.',
          details: parseError.message,
        },
        { status: 400 }
      );
    }

    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json(
        {
          error: 'ID do produto ou URL ausente.',
          received: { productId, externalUrl },
        },
        { status: 400 }
      );
    }

    // 3. Recupera User ID e Marca para organizar a pasta no Storage
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('user_id, brand')
      .eq('id', productId)
      .maybeSingle();

    if (fetchError || !product) {
      throw new Error('Produto não encontrado no banco de dados.');
    }

    // 4. Limpeza e Validação da URL
    const cleanUrl = externalUrl.trim();
    try {
      targetUrl = encodeURI(cleanUrl);
      new URL(targetUrl);
    } catch (e) {
      throw new Error(`URL fornecida é inválida: ${cleanUrl}`);
    }

    console.log(
      `[IMAGE SYNC] Processando imagem para User ${product.user_id}: ${targetUrl}`
    );

    // 5. Download da Imagem Externa
    let downloadResponse;
    try {
      downloadResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: new URL(targetUrl).origin,
        },
        signal: AbortSignal.timeout(25000), // Timeout de 25 segundos
      });
    } catch (fetchError: any) {
      console.error('[FETCH ERROR]', {
        url: targetUrl,
        error: fetchError.message,
      });
      throw new Error(
        `Falha ao baixar imagem: ${fetchError.message}. Verifique se a URL está acessível.`
      );
    }

    if (!downloadResponse.ok) {
      throw new Error(
        `Falha no download (${downloadResponse.status}): Servidor externo recusou a conexão.`
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    if (originalBuffer.length === 0)
      throw new Error('A imagem baixada está vazia.');

    console.log(
      `[OPTIMIZATION] Tamanho original: ${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB`
    );

    // 6. OTIMIZAÇÃO COM SHARP - Reduz tamanho e melhora performance
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(originalBuffer)
        .resize(1200, 1200, {
          fit: 'inside', // Mantém proporção original
          withoutEnlargement: true, // Não aumenta imagens pequenas
        })
        .jpeg({
          quality: 85, // Qualidade boa com tamanho reduzido
          progressive: true, // Carregamento progressivo
          mozjpeg: true, // Compressão otimizada
        })
        .toBuffer();

      console.log(
        `[OPTIMIZATION] Tamanho otimizado: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - optimizedBuffer.length / originalBuffer.length) * 100)}% menor)`
      );
    } catch (sharpError: any) {
      console.error('[SHARP ERROR]', sharpError);
      // Fallback: usa imagem original se otimização falhar
      optimizedBuffer = originalBuffer;
      console.warn('[OPTIMIZATION] Usando imagem original (otimização falhou)');
    }

    // 7. Define o caminho no Storage (Isolamento por Usuário)
    const userId = product.user_id;
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${userId}/products/${brandFolder}/${productId}-${Date.now()}.jpg`; // Sempre JPEG otimizado

    // 8. Upload para o bucket 'product-images' (ou o seu bucket padrão)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000', // 1 ano de cache
      });

    if (uploadError) {
      console.error('[STORAGE ERROR]', uploadError);
      throw new Error(
        `Erro ao subir para o Supabase Storage: ${uploadError.message}`
      );
    }

    // 9. Gera URL pública da imagem
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData?.publicUrl || null;

    // 10. Atualiza o produto no Banco de Dados com o caminho e URL pública
    const { error: dbError } = await supabaseAdmin
      .from('products')
      .update({
        image_path: uploadData.path,
        image_url: publicUrl,
        external_image_url: null, // Limpa a URL externa após internalizar
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (dbError) throw new Error(`Erro ao atualizar banco: ${dbError.message}`);

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      url: publicUrl,
      message: 'Imagem processada e vinculada com sucesso.',
    });
  } catch (error: any) {
    console.error(`[SYNC FAILURE]`, {
      url: targetUrl,
      error: error.message,
      stack: error.stack,
      cause: error.cause,
    });

    // Retorna erro mais detalhado
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro inesperado ao processar imagem.',
        url: targetUrl,
        details:
          error.cause?.message ||
          error.stack?.split('\n')[0] ||
          'Nenhum detalhe adicional',
      },
      { status: 500 }
    );
  }
}
