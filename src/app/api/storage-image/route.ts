import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const bucketParam = searchParams.get('bucket');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // 1. Configurações do Supabase (Server-side)
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPA || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Supabase credentials not found' },
      { status: 500 }
    );
  }

  // 2. Normalização do Path e Bucket
  // Remove barras iniciais e espaços
  let effectivePath = filePath.replace(/^\/+/, '').trim();
  let effectiveBucket = bucketParam || 'product-images';

  // Lógica de Legado: Se o path vier como "product-images/diretorio/foto.jpg"
  if (!bucketParam && effectivePath.startsWith('product-images/')) {
    effectiveBucket = 'product-images';
    effectivePath = effectivePath.replace(/^product-images\/?/, '');
  }

  try {
    const supabase = createClient(SUPA, SERVICE_KEY);

    // 3. Download do arquivo do Storage
    const { data: downloadData, error: dlError } = await supabase.storage
      .from(effectiveBucket)
      .download(effectivePath);

    if (dlError || !downloadData) {
      console.error('[storage-image] 404 ou Erro:', dlError);
      return returnPlaceholderSvg(effectivePath, 404);
    }

    // 4. Processamento do Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Identificação do Content-Type (MIME)
    const ext = effectivePath.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      svg: 'image/svg+xml',
      gif: 'image/gif',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 6. Resposta com Cache agressivo para performance
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        // Cache de 1 dia no navegador, 7 dias no servidor (Vercel/Cloudflare)
        'Cache-Control':
          'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[storage-image] Erro Crítico:', err?.message);
    return returnPlaceholderSvg('Erro interno', 500);
  }
}

/**
 * Retorna um SVG amigável em caso de erro para não quebrar o layout da tabela.
 */
function returnPlaceholderSvg(message: string, status: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="100%" height="100%" fill="#f8fafc" />
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold">
        IMAGEM
      </text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="10">
        ${message.length > 20 ? 'NÃO ENCONTRADA' : message.toUpperCase()}
      </text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    status,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
  });
}
