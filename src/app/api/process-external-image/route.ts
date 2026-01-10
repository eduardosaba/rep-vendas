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
      const urlObj = new URL(targetUrl);

      downloadResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Referer: urlObj.origin + '/',
          Origin: urlObj.origin,
          Connection: 'keep-alive',
        },
        redirect: 'follow', // Segue redirecionamentos automaticamente
        signal: AbortSignal.timeout(30000), // Timeout de 30 segundos
      });
    } catch (fetchError: any) {
      console.error('[FETCH ERROR]', {
        url: targetUrl,
        error: fetchError.message,
        name: fetchError.name,
        cause: fetchError.cause,
      });

      // Mensagens mais específicas
      let friendlyError = fetchError.message;

      if (
        fetchError.name === 'AbortError' ||
        fetchError.message.includes('timeout')
      ) {
        friendlyError =
          'Timeout: A URL demorou muito para responder (>30s). Tente uma imagem menor ou hospedada em servidor mais rápido.';
      } else if (
        fetchError.message.includes('ENOTFOUND') ||
        fetchError.message.includes('getaddrinfo')
      ) {
        friendlyError =
          'URL não encontrada: Verifique se o endereço está correto e se o servidor está online.';
      } else if (fetchError.message.includes('ECONNREFUSED')) {
        friendlyError =
          'Conexão recusada: O servidor bloqueou a conexão. Tente fazer upload manual da imagem.';
      } else if (
        fetchError.message.includes('certificate') ||
        fetchError.message.includes('SSL') ||
        fetchError.message.includes('TLS')
      ) {
        friendlyError =
          'Erro de certificado SSL: O site tem problemas de segurança. Configure ALLOW_INSECURE_TLS=1 no .env.local (apenas desenvolvimento).';
      } else if (fetchError.message.includes('CORS')) {
        friendlyError =
          'Bloqueio CORS: O site não permite download de imagens por terceiros. Faça upload manual.';
      }

      throw new Error(friendlyError);
    }

    if (!downloadResponse.ok) {
      const statusMessages: Record<number, string> = {
        400: 'Requisição inválida (400): A URL pode estar malformada.',
        401: 'Não autorizado (401): A imagem requer autenticação.',
        403: 'Acesso negado (403): O servidor bloqueou o acesso. Tente fazer upload manual.',
        404: 'Imagem não encontrada (404): Verifique se a URL está correta.',
        429: 'Muitas requisições (429): O servidor bloqueou por excesso de tentativas. Aguarde alguns minutos.',
        500: 'Erro no servidor externo (500): O site está com problemas.',
        502: 'Gateway indisponível (502): O servidor intermediário falhou.',
        503: 'Serviço indisponível (503): O site está temporariamente offline.',
      };

      const errorMsg =
        statusMessages[downloadResponse.status] ||
        `Falha no download (${downloadResponse.status}): Servidor externo recusou a conexão.`;

      throw new Error(errorMsg);
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
    let extension = 'jpg';

    try {
      // Detecta formato da imagem original
      const metadata = await sharp(originalBuffer).metadata();
      console.log(
        `[OPTIMIZATION] Formato detectado: ${metadata.format}, ${metadata.width}x${metadata.height}`
      );

      // Otimiza apenas se for imagem válida
      if (
        metadata.format &&
        ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'].includes(metadata.format)
      ) {
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
      } else {
        throw new Error(`Formato não suportado: ${metadata.format}`);
      }
    } catch (sharpError: any) {
      console.error('[SHARP ERROR]', sharpError.message);
      // Fallback: usa imagem original se otimização falhar
      optimizedBuffer = originalBuffer;
      extension = 'jpg'; // Assume JPG como padrão
      console.warn('[OPTIMIZATION] Usando imagem original (otimização falhou)');
    }

    // 7. Define o caminho no Storage (Isolamento por Usuário)
    const userId = product.user_id;
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${userId}/products/${brandFolder}/${productId}-${Date.now()}.${extension}`;

    // 8. Upload para o bucket 'product-images' (ou o seu bucket padrão)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, optimizedBuffer, {
        contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
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
      name: error.name,
    });

    // Retorna erro mais detalhado incluindo informações do erro original
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro inesperado ao processar imagem.',
        url: targetUrl,
        errorType: error.name || 'Error',
        details:
          error.cause?.message ||
          error.stack?.split('\n')[1]?.trim() ||
          'Nenhum detalhe adicional',
        originalError: error.cause?.code || error.code || null,
      },
      { status: 500 }
    );
  }
}
