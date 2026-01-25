#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'Erro: defina DATABASE_URL com a string de conexão do Postgres.'
  );
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'scripts', 'orphan-report');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const client = new Client({ connectionString });

function toCSV(rows, headers) {
  const esc = (v) =>
    v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(',')]
    .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(',')))
    .join('\n');
}

(async function main() {
  await client.connect();
  try {
    console.log('1) Buscando objetos de storage (storage.objects)');
    const storageRes = await client.query(
      'SELECT bucket_id, name, updated_at FROM storage.objects LIMIT 100000'
    );
    const storageRows = storageRes.rows || [];
    console.log(`  -> objetos no bucket: ${storageRows.length}`);

    console.log('2) Buscando URLs referenciadas em product_images');
    const piRes = await client.query(
      'SELECT id, product_id, url, is_primary, sync_status, sync_error, created_at FROM product_images'
    );
    const piRows = piRes.rows || [];
    console.log(`  -> product_images rows: ${piRows.length}`);

    console.log(
      '3) Buscando URLs em products (image_url, external_image_url, images array)'
    );
    const prodRes = await client.query(
      'SELECT id, reference_code, name, image_url, external_image_url, images FROM products'
    );
    const prodRows = prodRes.rows || [];
    console.log(`  -> products rows: ${prodRows.length}`);

    // Build a set of referenced object names by checking if storage name appears in any URL
    const referencedNames = new Set();
    const allUrls = [];

    const addUrl = (u) => {
      if (!u) return;
      allUrls.push(u);
    };

    for (const r of piRows) addUrl(r.url);
    for (const p of prodRows) {
      addUrl(p.image_url);
      addUrl(p.external_image_url);
      if (Array.isArray(p.images)) p.images.forEach(addUrl);
      else if (typeof p.images === 'string' && p.images.startsWith('[')) {
        try {
          const arr = JSON.parse(p.images);
          if (Array.isArray(arr)) arr.forEach(addUrl);
        } catch (e) {}
      }
    }

    // Normalize URLs to strings
    const urls = allUrls.map((u) => (u || '').toString());

    // For performance, create a map of storage name -> whether referenced
    const orphanStorage = [];
    for (const s of storageRows) {
      const name = s.name || '';
      const found = urls.some((u) => u.includes(name));
      if (!found)
        orphanStorage.push({
          bucket_id: s.bucket_id,
          name: s.name,
          updated_at: s.updated_at,
        });
    }

    console.log(`  -> objetos órfãos detectados: ${orphanStorage.length}`);

    // product_images orphan: product_id null OR product not found
    const orphanProductImages = [];
    const productIds = new Set(prodRows.map((p) => p.id));
    for (const pi of piRows) {
      if (!pi.product_id || !productIds.has(pi.product_id)) {
        orphanProductImages.push(pi);
      }
    }
    console.log(
      `  -> product_images órfãs (sem product): ${orphanProductImages.length}`
    );

    // products without images
    const productsWithoutImages = [];
    for (const p of prodRows) {
      const hasImage =
        (p.image_url && p.image_url.toString().trim() !== '') ||
        (p.external_image_url && p.external_image_url.toString().trim() !== '');
      const hasGallery = piRows.some((pi) => pi.product_id === p.id);
      if (!hasImage && !hasGallery)
        productsWithoutImages.push({
          id: p.id,
          reference_code: p.reference_code,
          name: p.name,
        });
    }
    console.log(`  -> products sem imagens: ${productsWithoutImages.length}`);

    // Write CSVs
    const storageCsv = toCSV(orphanStorage, [
      'bucket_id',
      'name',
      'updated_at',
    ]);
    fs.writeFileSync(
      path.join(outDir, 'orphan_storage.csv'),
      storageCsv,
      'utf8'
    );

    const piCsv = toCSV(orphanProductImages, [
      'id',
      'product_id',
      'url',
      'is_primary',
      'sync_status',
      'sync_error',
      'created_at',
    ]);
    fs.writeFileSync(
      path.join(outDir, 'orphan_product_images.csv'),
      piCsv,
      'utf8'
    );

    const prodCsv = toCSV(productsWithoutImages, [
      'id',
      'reference_code',
      'name',
    ]);
    fs.writeFileSync(
      path.join(outDir, 'products_without_images.csv'),
      prodCsv,
      'utf8'
    );

    console.log('\nArquivos gerados em:', outDir);
    console.log(' - orphan_storage.csv');
    console.log(' - orphan_product_images.csv');
    console.log(' - products_without_images.csv');
  } catch (err) {
    console.error('Erro ao gerar relatório de órfãos:', err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();
