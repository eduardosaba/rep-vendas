import sharp from 'sharp';
import { NextResponse } from 'next/server';

/**
 * Endpoint de teste para validar se o Sharp está funcionando
 * Acesse: /api/test-sharp
 */
export async function GET() {
  try {
    console.log('[TEST-SHARP] Iniciando teste...');

    // 1. Testa criação de imagem sintética
    const syntheticBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .webp({ quality: 80 })
      .toBuffer();

    console.log(
      '[TEST-SHARP] ✅ Imagem sintética criada:',
      syntheticBuffer.length,
      'bytes'
    );

    // 2. Testa redimensionamento
    const resizedBuffer = await sharp(syntheticBuffer)
      .resize(50, 50)
      .webp({ quality: 70 })
      .toBuffer();

    console.log(
      '[TEST-SHARP] ✅ Redimensionamento OK:',
      resizedBuffer.length,
      'bytes'
    );

    // 3. Informações do Sharp
    const metadata = await sharp(syntheticBuffer).metadata();
    console.log('[TEST-SHARP] ✅ Metadata:', metadata);

    return NextResponse.json({
      success: true,
      message: '🎉 Sharp está funcionando perfeitamente!',
      details: {
        syntheticSize: syntheticBuffer.length,
        resizedSize: resizedBuffer.length,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        },
      },
    });
  } catch (error: any) {
    console.error('[TEST-SHARP] ❌ ERRO:', error.message);
    console.error('[TEST-SHARP] Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        suggestion:
          'Execute: pnpm remove sharp && pnpm add sharp && pnpm run build',
      },
      { status: 500 }
    );
  }
}
