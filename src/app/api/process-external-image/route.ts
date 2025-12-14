import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';

// Força IPv4 para evitar erros de conexão em alguns ambientes Node
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Permite baixar de sites com SSL antigo/inválido
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Função para limpar nomes de pasta (Ex: "Ray-Ban" -> "ray-ban")
function sanitizeFolder(name: string | null | undefined) {
  if (!name) return 'geral'; // Pasta padrão se não tiver marca
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
        { error: 'Configuração de servidor incompleta.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Recebe os dados
    const body = await request.json();
    const { productId, externalUrl } = body;

    if (!productId || !externalUrl) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    // 3. BUSCA SEGURA: Recupera User ID e Marca do banco
    // Isso garante que o arquivo vá para a pasta do usuário correto
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('user_id, brand')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Produto não encontrado no banco.');
    }

    // 4. Download da Imagem
    const cleanUrl = externalUrl.trim();
    try {
      targetUrl = encodeURI(cleanUrl);
      new URL(targetUrl);
    } catch (e) {
      throw new Error(`URL inválida: ${cleanUrl}`);
    }

    console.log(`[SYNC] Baixando para User ${product.user_id}: ${targetUrl}`);

    const downloadResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: new URL(targetUrl).origin,
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text().catch(() => '');
      throw new Error(
        `Falha download (${downloadResponse.status}): ${errorText.slice(0, 50)}`
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) throw new Error('Imagem vazia recebida.');

    // 5. Preparar Upload
    const contentType =
      downloadResponse.headers.get('content-type') || 'image/jpeg';
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('gif')) extension = 'gif';

    // --- ESTRUTURA DE PASTAS MULTI-USUÁRIO ---
    // products / {USER_ID} / {MARCA} / {ARQUIVO}
    const userId = product.user_id;
    const brandFolder = sanitizeFolder(product.brand);

    // Nome do arquivo com timestamp para evitar cache/colisão
    const fileName = `${userId}/${brandFolder}/${productId}-${Date.now()}.${extension}`;

    // 6. Upload para o Supabase
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('products')
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[STORAGE ERROR]', uploadError);
      throw new Error(`Erro Supabase Storage: ${uploadError.message}`);
    }

    // 7. Atualizar Produto com o novo caminho
    const { error: dbError } = await supabaseAdmin
      .from('products')
      .update({ image_path: uploadData.path })
      .eq('id', productId);

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`);

    return NextResponse.json({ success: true, path: uploadData.path });
  } catch (error: any) {
    console.error(`[SYNC FAILURE] URL: ${targetUrl}`, error);

    return NextResponse.json(
      {
        error: error.message || 'Erro desconhecido',
        url: targetUrl,
        cause: error.cause ? String(error.cause) : undefined,
      },
      { status: 500 }
    );
  }
}
