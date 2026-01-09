#!/usr/bin/env node
/**
 * Exibe o SQL da função sync_brands para aplicar manualmente
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═'.repeat(80));
console.log('🔧 FUNÇÃO SYNC_BRANDS - COPIE E COLE NO SUPABASE SQL EDITOR');
console.log('═'.repeat(80));
console.log(
  '\n📍 Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql\n'
);
console.log('═'.repeat(80));
console.log('\n');

const sqlPath = join(__dirname, '..', 'SQL', 'create_sync_brands_function.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log(sql);

console.log('\n');
console.log('═'.repeat(80));
console.log(
  '✅ Após executar no Supabase, a sincronização de marcas funcionará!'
);
console.log('═'.repeat(80));
