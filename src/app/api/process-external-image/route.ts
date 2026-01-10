import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'node:dns';
import sharp from 'sharp';
/*
 * 2. BYPASS DE SSL (OPCIONAL - DEV ONLY)
 * Alguns portais (Safilo, Luxottica) têm certificados que o Node 22 rejeita por padrão.
 * Habilite explicitamente definindo `ALLOW_INSECURE_TLS=1` ou em NODE_ENV=development.
 */
if (process.env.NODE_ENV === 'development' || process.env.ALLOW_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[process-external-image] WARNING: TLS verification disabled (ALLOW_INSECURE_TLS=1). Do NOT enable in production.');
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

// Wrapper de fetch com timeout, retries e logs detalhados
async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 30000,
  retries = 1
) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    Connection: 'keep-alive',
    ...(opts.headers as Record<string, string> | undefined),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...opts,
        headers,
        redirect: 'follow',
        signal,
      } as RequestInit);

      clearTimeout(timer);
      return res;
    } catch (err: any) {
      const name = err?.name || '';
      const message = err?.message || '';
      const code = err?.code || '';

      const isTimeout = name === 'AbortError' || /timeout/i.test(message);
      const isSSL = /certificate|TLS|SSL/i.test(message);
      const isDNS = /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(
        message || code || ''
      );

      console.error('[process-external-image] fetch error', {
        url,
        attempt,
        message,
        code,
        isTimeout,
        isSSL,
        isDNS,
      });

      // Não retry para erros críticos de SSL ou DNS
      if (isSSL || isDNS) throw err;
      if (attempt === retries) throw err;

      // Pequena espera exponencial antes do retry
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }

  throw new Error('Failed to fetch');
}

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
     * Usamos fetchWithTimeout para melhorar robustez (timeout, retries, logs).
     */
    console.log(`[SYNC] Tentando download: ${targetUrl}`);

    let downloadResponse;
    try {
      downloadResponse = await fetchWithTimeout(
        targetUrl,
        {
          method: 'GET',
          headers: {
            Referer: 'https://commportal.safilo.com/',
            'Cache-Control': 'no-cache',
          },
        },
        45000,
        1
      );
    } catch (err: any) {
      console.error('[process-external-image] falha ao baixar imagem', {
        url: targetUrl,
        message: err?.message,
        code: err?.code,
      });
      throw err;
    }

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
