import sharp from 'sharp';

(async () => {
  try {
    console.log('[LOCAL-SHARP] Iniciando teste...');

    const syntheticBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .webp({ quality: 80 })
      .toBuffer();

    console.log(
      '[LOCAL-SHARP] ✅ Imagem sintética criada:',
      syntheticBuffer.length,
      'bytes'
    );

    const resizedBuffer = await sharp(syntheticBuffer)
      .resize(50, 50)
      .webp({ quality: 70 })
      .toBuffer();

    console.log(
      '[LOCAL-SHARP] ✅ Redimensionamento OK:',
      resizedBuffer.length,
      'bytes'
    );

    const metadata = await sharp(syntheticBuffer).metadata();
    console.log('[LOCAL-SHARP] ✅ Metadata:', metadata);

    console.log('[LOCAL-SHARP] OK');
    process.exit(0);
  } catch (err) {
    console.error('[LOCAL-SHARP] ERRO:', err);
    process.exit(1);
  }
})();
