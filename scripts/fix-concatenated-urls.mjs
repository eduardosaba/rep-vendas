#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const APPLY = process.argv.includes('--apply');
const LIMIT_ARG_INDEX = process.argv.indexOf('--limit');
const LIMIT =
  LIMIT_ARG_INDEX !== -1 ? Number(process.argv[LIMIT_ARG_INDEX + 1]) : 0;

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

function extractUrls(text) {
  if (!text) return [];
  const s = String(text);
  const regex = /https?:\/\/(?:[\w\-._~:\/?#\[\]@!$&'()*+,;=%]|\\\s)+/gi;
  const matches = s.match(regex) || [];
  // Trim trailing punctuation
  return matches
    .map((m) => m.replace(/[\)\]\.,;!\s]+$/, ''))
    .filter(Boolean)
    .map((u) => u.trim());
}

(async function main() {
  await client.connect();
  try {
    console.log('Buscando produtos com URLs concatenadas...');
    let sql = `SELECT id, reference_code, name, image_url, external_image_url FROM products WHERE (image_url ~ '(https?:\\/\\/).*(https?:\\/\\/)' OR external_image_url ~ '(https?:\\/\\/).*(https?:\\/\\/)')`;
    if (LIMIT && LIMIT > 0) sql += ` LIMIT ${LIMIT}`;

    const res = await client.query(sql);
    const rows = res.rows || [];
    console.log(`Encontrados ${rows.length} produtos candidatos`);

    const preview = [];

    for (const p of rows) {
      const iu = extractUrls(p.image_url);
      const eu = extractUrls(p.external_image_url);
      const urls = iu.length > 0 ? iu : eu; // prefer image_url
      const unique = Array.from(new Set(urls));
      if (unique.length <= 1) continue; // nothing to split

      preview.push({
        id: p.id,
        reference_code: p.reference_code,
        name: p.name,
        original_image_url: p.image_url,
        original_external_image_url: p.external_image_url,
        parsed_urls: unique,
      });
    }

    const previewPath = path.join(
      outDir,
      `fix-concat-preview-${Date.now()}.json`
    );
    fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2), 'utf8');
    console.log(`Preview salvo em: ${previewPath}`);

    if (!APPLY) {
      console.log(
        'Rodando em modo PREVIEW (não será feita nenhuma alteração). Use --apply para executar.'
      );
      console.log(`Total a processar (preview): ${preview.length}`);
      process.exit(0);
    }

    console.log(
      '--apply detectado: aplicando correções em lote (cada produto em transação) --'
    );
    for (const item of preview) {
      const trx = await client.query('BEGIN');
      try {
        const urls = item.parsed_urls;
        const first = urls[0];
        // Insert all URLs into product_images (ON CONFLICT DO NOTHING)
        for (let i = 0; i < urls.length; i++) {
          const u = urls[i];
          await client.query(
            `INSERT INTO product_images (product_id, url, is_primary, position, sync_status, created_at)
             VALUES ($1,$2,$3,$4,'pending',now())
             ON CONFLICT (product_id, url) DO NOTHING`,
            [item.id, u, i === 0, i]
          );
        }
        // Update products.image_url to first
        await client.query(`UPDATE products SET image_url = $1 WHERE id = $2`, [
          first,
          item.id,
        ]);
        // Force is_primary flags: set true for first URL row, false for others
        await client.query(
          `UPDATE product_images SET is_primary = (url = $2) WHERE product_id = $1`,
          [item.id, first]
        );
        // Ensure all product_images for product are marked pending (so sync picks up)
        await client.query(
          `UPDATE product_images SET sync_status = 'pending' WHERE product_id = $1`,
          [item.id]
        );

        await client.query('COMMIT');
        console.log(
          `OK product ${item.reference_code || item.id} processed, urls:${urls.length}`
        );
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`ERRO processing product ${item.id}:`, err);
      }
    }

    console.log(
      'Aplicação concluída. Recomenda-se rodar local-sync-full.mjs apenas para os produtos processados.'
    );
  } catch (err) {
    console.error('Erro no script:', err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();
