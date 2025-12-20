// Script de Otimização de Imagens
// Uso: node scripts/optimize-images.mjs
//
// Este script:
// - Varre recursivamente a pasta /public/images
// - Redimensiona imagens maiores que 1920px
// - Converte para WebP (qualidade 80%)
// - Gera versões responsivas (320px, 640px, 1024px, 1920px)
// - Cria log do espaço economizado

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  inputDir: path.join(__dirname, '../public/images'),
  outputDir: path.join(__dirname, '../public/images/optimized'),
  maxWidth: 1920,
  webpQuality: 80,
  responsiveSizes: [320, 640, 1024, 1920], // Breakpoints para versões responsivas
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

// Estatísticas
const stats = {
  totalFiles: 0,
  processedFiles: 0,
  skippedFiles: 0,
  errors: 0,
  originalSize: 0,
  optimizedSize: 0,
};

/**
 * Formata bytes para leitura humana
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Verifica se o arquivo é uma imagem suportada
 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return CONFIG.extensions.includes(ext);
}

/**
 * Obtém todos os arquivos recursivamente
 */
async function getAllFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Pula a pasta de output
      if (fullPath === CONFIG.outputDir) continue;
      files.push(...(await getAllFiles(fullPath)));
    } else if (isImageFile(item.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Otimiza uma imagem
 */
async function optimizeImage(inputPath) {
  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const relativePath = path.relative(
      CONFIG.inputDir,
      path.dirname(inputPath)
    );
    const outputPath = path.join(CONFIG.outputDir, relativePath);

    // Cria o diretório de saída se não existir
    await fs.mkdir(outputPath, { recursive: true });

    // Lê a imagem original
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const originalStats = await fs.stat(inputPath);

    stats.originalSize += originalStats.size;

    console.log(`\n📷 Processando: ${path.basename(inputPath)}`);
    console.log(`   Dimensões originais: ${metadata.width}x${metadata.height}`);
    console.log(`   Tamanho original: ${formatBytes(originalStats.size)}`);

    let totalOptimizedSize = 0;

    // Gera versões responsivas
    for (const size of CONFIG.responsiveSizes) {
      // Pula se a imagem original já é menor que o tamanho alvo
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

      const optimizedStats = await fs.stat(outputFile);
      totalOptimizedSize += optimizedStats.size;

      console.log(
        `   ✅ Gerado: ${outputFilename} (${formatBytes(optimizedStats.size)})`
      );
    }

    // Gera versão principal otimizada (max 1920px)
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
    stats.optimizedSize += totalOptimizedSize;

    console.log(
      `   ✅ Principal: ${filename}.webp (${formatBytes(mainStats.size)})`
    );

    const savings = originalStats.size - totalOptimizedSize;
    const savingsPercent = ((savings / originalStats.size) * 100).toFixed(1);

    if (savings > 0) {
      console.log(
        `   💾 Economia: ${formatBytes(savings)} (${savingsPercent}%)`
      );
    }

    stats.processedFiles++;
  } catch (error) {
    console.error(`   ❌ Erro ao processar ${inputPath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando otimização de imagens...\n');
  console.log(`📂 Diretório de entrada: ${CONFIG.inputDir}`);
  console.log(`📂 Diretório de saída: ${CONFIG.outputDir}`);
  console.log(`🎯 Tamanho máximo: ${CONFIG.maxWidth}px`);
  console.log(`🎨 Qualidade WebP: ${CONFIG.webpQuality}%`);
  console.log(`📐 Breakpoints: ${CONFIG.responsiveSizes.join(', ')}px`);

  // Verifica se o diretório de entrada existe
  try {
    await fs.access(CONFIG.inputDir);
  } catch {
    console.error(`\n❌ Diretório não encontrado: ${CONFIG.inputDir}`);
    process.exit(1);
  }

  // Cria o diretório de saída
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  // Busca todos os arquivos
  console.log('\n🔍 Buscando imagens...');
  const files = await getAllFiles(CONFIG.inputDir);
  stats.totalFiles = files.length;

  console.log(`\n📊 Encontradas ${stats.totalFiles} imagens\n`);
  console.log('═'.repeat(60));

  // Processa cada arquivo
  for (const file of files) {
    await optimizeImage(file);
  }

  // Exibe estatísticas finais
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RELATÓRIO FINAL:\n');
  console.log(`   Total de arquivos encontrados: ${stats.totalFiles}`);
  console.log(`   ✅ Processados com sucesso: ${stats.processedFiles}`);
  console.log(`   ⏭️  Pulados: ${stats.skippedFiles}`);
  console.log(`   ❌ Erros: ${stats.errors}`);
  console.log(
    `\n   📦 Tamanho original total: ${formatBytes(stats.originalSize)}`
  );
  console.log(
    `   📦 Tamanho otimizado total: ${formatBytes(stats.optimizedSize)}`
  );

  const totalSavings = stats.originalSize - stats.optimizedSize;
  const totalSavingsPercent =
    stats.originalSize > 0
      ? ((totalSavings / stats.originalSize) * 100).toFixed(1)
      : 0;

  console.log(
    `   💾 Economia total: ${formatBytes(totalSavings)} (${totalSavingsPercent}%)`
  );

  console.log('\n✨ Otimização concluída!\n');
  console.log(`📁 Imagens otimizadas salvas em: ${CONFIG.outputDir}\n`);
}

// Executa o script
main().catch(console.error);
