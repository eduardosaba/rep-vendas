import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';

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
    console.log('⚠️ [SECURITY] Verificação TLS desativada para processamento de imagens externas.');
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
    const body = await request.json();
    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json({ error: 'ID do produto ou URL ausente.' }, { status: 400 });
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

    console.log(`[IMAGE SYNC] Processando imagem para User ${product.user_id}: ${targetUrl}`);

    // 5. Download da Imagem Externa
    const downloadResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': new URL(targetUrl).origin,
      },
      signal: AbortSignal.timeout(25000), // Timeout de 25 segundos
    });

    if (!downloadResponse.ok) {
      throw new Error(`Falha no download (${downloadResponse.status}): Servidor externo recusou a conexão.`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) throw new Error('A imagem baixada está vazia.');

    // 6. Detecta extensão baseada no Content-Type
    const contentType = downloadResponse.headers.get('content-type') || 'image/jpeg';
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('gif')) extension = 'gif';

    // 7. Define o caminho no Storage (Isolamento por Usuário)
    const userId = product.user_id;
    const brandFolder = sanitizeFolder(product.brand);
    const fileName = `public/${userId}/products/${brandFolder}/${productId}-${Date.now()}.${extension}`;

    // 8. Upload para o bucket 'product-images' (ou o seu bucket padrão)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images') 
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[STORAGE ERROR]', uploadError);
      throw new Error(`Erro ao subir para o Supabase Storage: ${uploadError.message}`);
    }

    // 9. Atualiza o produto no Banco de Dados com o novo caminho relativo
    const { error: dbError } = await supabaseAdmin
      .from('products')
      .update({ 
        image_path: uploadData.path,
        updated_at: new Date().toISOString() 
      })
      .eq('id', productId);

    if (dbError) throw new Error(`Erro ao atualizar banco: ${dbError.message}`);

    return NextResponse.json({ 
      success: true, 
      path: uploadData.path,
      message: 'Imagem processada e vinculada com sucesso.'
    });

  } catch (error: any) {
    console.error(`[SYNC FAILURE] URL: ${targetUrl}`, error.message);

    return NextResponse.json(
      {
        error: error.message || 'Erro inesperado ao processar imagem.',
        url: targetUrl,
      },
      { status: 500 }
    );
  }
}