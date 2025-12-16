import { NextRequest } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const OPTIMIZED_DIR = path.join(IMAGES_DIR, 'optimized');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const CONFIG = {
  maxWidth: 1920,
  webpQuality: 80,
  responsiveSizes: [320, 640, 1024, 1920],
};

async function getAllImageFiles(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  const files: string[] = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (fullPath === OPTIMIZED_DIR) continue;

      if (item.isDirectory()) {
        files.push(...(await getAllImageFiles(fullPath, baseDir)));
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
  }

  return files;
}

async function optimizeImage(
  inputPath: string,
  encoder: ReadableStreamDefaultController
) {
  const sendLog = (message: string) => {
    encoder.enqueue(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
  };

  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const relativePath = path.relative(IMAGES_DIR, path.dirname(inputPath));
    const outputPath = path.join(OPTIMIZED_DIR, relativePath);

    await fs.mkdir(outputPath, { recursive: true });

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const originalStats = await fs.stat(inputPath);

    sendLog(
      `📷 ${path.basename(inputPath)} (${metadata.width}x${metadata.height}, ${formatBytes(originalStats.size)})`
    );

    let totalOptimizedSize = 0;

    // Gera versões responsivas
    for (const size of CONFIG.responsiveSizes) {
      if (metadata.width && metadata.width < size) continue;

      const outputFilename = `${filename}-${size}w.webp`;
      const outputFile = path.join(outputPath, outputFilename);

      await sharp(inputPath)
        .resize(size, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: CONFIG.webpQuality })
        .toFile(outputFile);

      const stats = await fs.stat(outputFile);
      totalOptimizedSize += stats.size;
    }

    // Versão principal
    const mainOutputFile = path.join(outputPath, `${filename}.webp`);
    await sharp(inputPath)
      .resize(CONFIG.maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: CONFIG.webpQuality })
      .toFile(mainOutputFile);

    const mainStats = await fs.stat(mainOutputFile);
    totalOptimizedSize += mainStats.size;

    const savings = originalStats.size - totalOptimizedSize;
    const savingsPercent = ((savings / originalStats.size) * 100).toFixed(1);

    sendLog(
      `   ✅ Otimizado: ${formatBytes(mainStats.size)} (economia: ${savingsPercent}%)`
    );

    return {
      originalSize: originalStats.size,
      optimizedSize: totalOptimizedSize,
      savings,
    };
  } catch (error) {
    sendLog(
      `   ❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
    throw error;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const specificImages: string[] | undefined = body.images;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const encoder = controller;

        const sendLog = (message: string) => {
          encoder.enqueue(
            `data: ${JSON.stringify({ type: 'log', message })}\n\n`
          );
        };

        sendLog('🚀 Iniciando otimização de imagens...');

        // Lista arquivos
        let filesToOptimize: string[];

        if (specificImages && specificImages.length > 0) {
          filesToOptimize = specificImages.map((img) =>
            path.join(IMAGES_DIR, img)
          );
          sendLog(
            `📦 Otimizando ${filesToOptimize.length} imagens selecionadas`
          );
        } else {
          filesToOptimize = await getAllImageFiles(IMAGES_DIR);
          sendLog(
            `📦 Encontradas ${filesToOptimize.length} imagens para otimizar`
          );
        }

        if (filesToOptimize.length === 0) {
          sendLog('⚠️ Nenhuma imagem encontrada');
          encoder.enqueue(
            `data: ${JSON.stringify({
              type: 'complete',
              processed: 0,
              savings: 0,
              savingsPercent: 0,
            })}\n\n`
          );
          controller.close();
          return;
        }

        // Cria diretório de saída
        await fs.mkdir(OPTIMIZED_DIR, { recursive: true });

        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;
        let processed = 0;

        for (const file of filesToOptimize) {
          try {
            encoder.enqueue(
              `data: ${JSON.stringify({
                type: 'progress',
                current: processed + 1,
                total: filesToOptimize.length,
                message: path.basename(file),
              })}\n\n`
            );

            const result = await optimizeImage(file, encoder);

            totalOriginalSize += result.originalSize;
            totalOptimizedSize += result.optimizedSize;
            processed++;
          } catch (error) {
            sendLog(`❌ Erro ao processar ${path.basename(file)}`);
          }
        }

        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const savingsPercent =
          totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

        sendLog('═'.repeat(60));
        sendLog(`✨ Otimização concluída!`);
        sendLog(`📊 Processadas: ${processed}/${filesToOptimize.length}`);
        sendLog(
          `💾 Economia: ${formatBytes(totalSavings)} (${savingsPercent.toFixed(1)}%)`
        );

        encoder.enqueue(
          `data: ${JSON.stringify({
            type: 'complete',
            processed,
            total: filesToOptimize.length,
            savings: totalSavings,
            savingsPercent,
          })}\n\n`
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          `data: ${JSON.stringify({
            type: 'error',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          })}\n\n`
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
