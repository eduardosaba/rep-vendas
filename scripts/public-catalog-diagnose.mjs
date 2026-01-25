#!/usr/bin/env node
import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'Erro: defina a variável de ambiente DATABASE_URL com a conexão do Postgres.'
  );
  console.error('Exemplo (Linux/macOS): export DATABASE_URL="postgres://..."');
  process.exit(1);
}

const client = new Client({ connectionString });

const queries = [
  {
    name: 'public_catalogs',
    sql: `SELECT id, user_id, slug, banners, banners_mobile, brands, updated_at
  FROM public_catalogs
  ORDER BY updated_at DESC
  LIMIT 200;`,
  },
  {
    name: 'product_brand_counts',
    sql: `SELECT user_id,
       COUNT(*) AS total_products,
       COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(brand),''), '') <> '') AS has_brand,
       COUNT(*) FILTER (WHERE brand IS NULL OR TRIM(brand) = '') AS no_brand
FROM products
GROUP BY user_id
ORDER BY total_products DESC
LIMIT 100;`,
  },
  {
    name: 'products_concatenated_image_url',
    sql: `SELECT id, reference_code, name, brand, image_url, external_image_url, sync_status, sync_error, updated_at
FROM products
WHERE image_url ~ '(https?:\\/\\/).*(https?:\\/\\/)'
ORDER BY updated_at DESC
LIMIT 200;`,
  },
];

(async function main() {
  try {
    await client.connect();
    const result = {};
    for (const q of queries) {
      const res = await client.query(q.sql);
      result[q.name] = res.rows;
      console.log(`-- Resultado: ${q.name} (rows: ${res.rowCount})`);
    }
    console.log('\n--- JSON OUTPUT ---\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Erro executando diagnóstico:', err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();
