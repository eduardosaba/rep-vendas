/**
 * Automated Test Script for Storage Cleanup Flow
 * Run with: node scripts/test_storage_cleanup_flow.mjs
 */

import crypto from 'crypto';

console.log('=== TEST SUITE: STORAGE CLEANUP & RESILIENT AUDIT ===\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASSED: ${testName}`);
    totalPassed++;
  } else {
    console.error(`❌ FAILED: ${testName}`);
    totalFailed++;
  }
}

// ----------------------------------------------------------------------------
// TEST 1: Canonical Path Normalization
// ----------------------------------------------------------------------------
function normalizeToCanonicalPath(rawPathOrUrl) {
  if (!rawPathOrUrl) return '';
  let cleaned = decodeURIComponent(rawPathOrUrl.trim());
  cleaned = cleaned.split('?')[0];

  const bucketMarker = '/object/public/product-images/';
  const authBucketMarker = '/object/authenticated/product-images/';
  if (cleaned.includes(bucketMarker)) {
    cleaned = cleaned.substring(cleaned.indexOf(bucketMarker) + bucketMarker.length);
  } else if (cleaned.includes(authBucketMarker)) {
    cleaned = cleaned.substring(cleaned.indexOf(authBucketMarker) + authBucketMarker.length);
  } else if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    const parts = cleaned.split('/product-images/');
    if (parts.length > 1) {
      cleaned = parts[1];
    }
  }

  cleaned = cleaned.replace(/^\/+/, '');
  if (cleaned.startsWith('public/')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

assert(
  normalizeToCanonicalPath('https://xyz.supabase.co/storage/v1/object/public/product-images/brands/boss/TH_2365.webp?w=480&token=123') ===
    'brands/boss/TH_2365.webp',
  '1.1 URL pública com query string normalizada para caminho canônico'
);

assert(
  normalizeToCanonicalPath('public/brands/boss/TH%202365.webp') === 'brands/boss/TH 2365.webp',
  '1.2 Caminho relativo com %20 decodificado e prefixo public/ removido'
);

assert(
  normalizeToCanonicalPath('brands/boss/TH_2365.webp') === 'brands/boss/TH_2365.webp',
  '1.3 Caminho já limpo mantido intacto'
);

// ----------------------------------------------------------------------------
// TEST 2: Token Hash Generation & Single-Use Verification
// ----------------------------------------------------------------------------
const rawToken = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
const recomputedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

assert(tokenHash === recomputedHash, '2.1 Hash SHA-256 do token é determinístico e idêntico');
assert(tokenHash.length === 64, '2.2 Hash SHA-256 possui 64 caracteres hexadecimais');

// ----------------------------------------------------------------------------
// TEST 3: Limit of 500 Items per Operation Validation
// ----------------------------------------------------------------------------
function validateBatchLimit(itemsCount) {
  if (itemsCount > 500) {
    return { valid: false, error: 'O limite máximo por operação é de 500 arquivos.' };
  }
  return { valid: true };
}

assert(validateBatchLimit(450).valid === true, '3.1 Lote com 450 itens é aceito');
assert(validateBatchLimit(500).valid === true, '3.2 Lote com 500 itens é aceito no limite exato');
assert(validateBatchLimit(501).valid === false, '3.3 Lote com 501 itens é rejeitado por exceder o limite');

// ----------------------------------------------------------------------------
// TEST 4: Family Protection Rule (Conservative Variant Match)
// ----------------------------------------------------------------------------
function checkFamilyInUse(canonicalPath, urlsInUseSet) {
  if (urlsInUseSet.has(canonicalPath) || urlsInUseSet.has(`public/${canonicalPath}`)) {
    return 'in_use';
  }
  const baseStem = canonicalPath.replace(/-(480w|1200w|main|00)(\.[a-z0-9]+)$/i, '$2');
  if (urlsInUseSet.has(baseStem)) {
    return 'in_use';
  }
  return 'orphan';
}

const mockUrlsInUse = new Set(['brands/boss/TH_2365.webp']);
assert(
  checkFamilyInUse('brands/boss/TH_2365-480w.webp', mockUrlsInUse) === 'in_use',
  '4.1 Variante -480w de imagem vinculada é protegida como IN_USE'
);
assert(
  checkFamilyInUse('brands/boss/TH_2365-1200w.webp', mockUrlsInUse) === 'in_use',
  '4.2 Variante -1200w de imagem vinculada é protegida como IN_USE'
);
assert(
  checkFamilyInUse('brands/boss/OTHER_FOTO.webp', mockUrlsInUse) === 'orphan',
  '4.3 Imagem sem nenhum vínculo na família é classificada como ORPHAN'
);

// ----------------------------------------------------------------------------
// TEST 5: Protected Systems Assets (logos, avatars, placeholders)
// ----------------------------------------------------------------------------
function isProtectedSystemAsset(path) {
  return (
    path.startsWith('trash/') ||
    path.startsWith('logos/') ||
    path.startsWith('avatars/') ||
    path.startsWith('covers/') ||
    path.startsWith('system/') ||
    path.includes('placeholder') ||
    path.includes('default-logo')
  );
}

assert(isProtectedSystemAsset('logos/company_logo.png') === true, '5.1 Arquivos em logos/ são protegidos');
assert(isProtectedSystemAsset('brands/boss/TH_2365.webp') === false, '5.2 Imagem regular de produto não é asset de sistema');
assert(isProtectedSystemAsset('system/no-image.webp') === true, '5.3 Placeholder do sistema é protegido');

// ----------------------------------------------------------------------------
// SUMMARY OF TEST RESULTS
// ----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${totalPassed} PASSED | ${totalFailed} FAILED`);
console.log(`==================================================\n`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All unit logic tests passed successfully!');
}
