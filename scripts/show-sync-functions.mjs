#!/usr/bin/env node
/**
 * Exibe o SQL das funções sync_brands e sync_categories para aplicar manualmente
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═'.repeat(80));
console.log(
  '🔧 FUNÇÕES DE SINCRONIZAÇÃO - COPIE E COLE NO SUPABASE SQL EDITOR'
);
console.log('═'.repeat(80));
console.log(
  '\n📍 Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql\n'
);
console.log('═'.repeat(80));
console.log('\n');

// Função sync_brands
console.log('-- ========================================');
console.log('-- 1. FUNÇÃO SYNC_BRANDS');
console.log('-- ========================================\n');

const brandsPath = join(
  __dirname,
  '..',
  'SQL',
  'create_sync_brands_function.sql'
);
const brandsSQL = readFileSync(brandsPath, 'utf-8');
console.log(brandsSQL);

console.log('\n\n');

// Função sync_categories
console.log('-- ========================================');
console.log('-- 2. FUNÇÃO SYNC_CATEGORIES');
console.log('-- ========================================\n');

const categoriesPath = join(
  __dirname,
  '..',
  'SQL',
  'create_sync_categories_function.sql'
);
const categoriesSQL = readFileSync(categoriesPath, 'utf-8');
console.log(categoriesSQL);

console.log('\n');
console.log('═'.repeat(80));
console.log('✅ Execute AMBAS as funções acima no Supabase SQL Editor');
console.log('═'.repeat(80));
console.log('\n💡 Após executar:');
console.log('   - Sincronização de Marcas funcionará em Dashboard > Marcas');
console.log(
  '   - Sincronização de Categorias funcionará em Dashboard > Categorias'
);
console.log('═'.repeat(80));
