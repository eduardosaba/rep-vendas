import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const OPTIMIZED_DIR = path.join(IMAGES_DIR, 'optimized');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

interface ImageFile {
  path: string;
  name: string;
  size: number;
  hasOptimized: boolean;
  optimizedPath?: string;
  optimizedSize?: number;
  savings?: number;
}

async function getAllImageFiles(
  dir: string,
  baseDir: string = dir
): Promise<ImageFile[]> {
  const files: ImageFile[] = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      // Pula a pasta optimized
      if (fullPath === OPTIMIZED_DIR) continue;

      if (item.isDirectory()) {
        files.push(...(await getAllImageFiles(fullPath, baseDir)));
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(baseDir, fullPath);

          // Verifica se existe versão otimizada
          const baseName = path.basename(item.name, ext);
          const optimizedPath = path.join(
            OPTIMIZED_DIR,
            path.dirname(relativePath),
            `${baseName}.webp`
          );

          let hasOptimized = false;
          let optimizedSize = 0;
          let savings = 0;

          try {
            const optimizedStats = await fs.stat(optimizedPath);
            hasOptimized = true;
            optimizedSize = optimizedStats.size;
            savings = stats.size - optimizedSize;
          } catch {
            // Arquivo otimizado não existe
          }

          files.push({
            path: relativePath,
            name: item.name,
            size: stats.size,
            hasOptimized,
            optimizedPath: hasOptimized
              ? path.relative(baseDir, optimizedPath)
              : undefined,
            optimizedSize: hasOptimized ? optimizedSize : undefined,
            savings: hasOptimized ? savings : undefined,
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao escanear diretório:', error);
  }

  return files;
}

export async function GET() {
  try {
    // Verifica se o diretório existe
    try {
      await fs.access(IMAGES_DIR);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Diretório de imagens não encontrado',
      });
    }

    const images = await getAllImageFiles(IMAGES_DIR);

    const stats = {
      totalImages: images.length,
      optimizedImages: images.filter((img) => img.hasOptimized).length,
      pendingImages: images.filter((img) => !img.hasOptimized).length,
      originalSize: images.reduce((sum, img) => sum + img.size, 0),
      optimizedSize: images.reduce(
        (sum, img) => sum + (img.optimizedSize || 0),
        0
      ),
      savings: images.reduce((sum, img) => sum + (img.savings || 0), 0),
      savingsPercent: 0,
    };

    if (stats.originalSize > 0) {
      stats.savingsPercent = (stats.savings / stats.originalSize) * 100;
    }

    return NextResponse.json({
      success: true,
      stats,
      images: images.sort((a, b) => {
        // Não otimizadas primeiro
        if (a.hasOptimized !== b.hasOptimized) {
          return a.hasOptimized ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      }),
    });
  } catch (error) {
    console.error('Erro ao escanear imagens:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
