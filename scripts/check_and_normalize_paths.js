#!/usr/bin/env node
// Usage:
// DATABASE_URL=postgres://... node scripts/check_and_normalize_paths.js [--apply]

const { Client } = require('pg');

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'Please set DATABASE_URL environment variable (Supabase DB connection).'
    );
    process.exit(2);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log(
      'Connected. Running checks for "product-images/public" and "public/<uuid>" patterns...'
    );

    const checks = [
      {
        name: 'brands.logo_url (product-images/public)',
        q: "SELECT count(*)::int as cnt FROM brands WHERE logo_url ~* 'product-images/public'",
      },
      {
        name: 'brands (examples)',
        q: "SELECT id, name, logo_url FROM brands WHERE logo_url ~* 'product-images/public' LIMIT 20",
      },
      {
        name: 'product_images.storage_path (product-images/public)',
        q: "SELECT count(*)::int as cnt FROM product_images WHERE storage_path ~* 'product-images/public'",
      },
      {
        name: 'product_images (examples)',
        q: "SELECT id, product_id, storage_path FROM product_images WHERE storage_path ~* 'product-images/public' LIMIT 20",
      },
      {
        name: 'products.image_path (product-images/public)',
        q: "SELECT count(*)::int as cnt FROM products WHERE image_path ~* 'product-images/public'",
      },
      {
        name: 'products (examples)',
        q: "SELECT id, name, image_path FROM products WHERE image_path ~* 'product-images/public' LIMIT 20",
      },
      {
        name: 'public_catalogs (logo/single_brand/banners)',
        q: "SELECT id, slug, logo_url, single_brand_logo_url, banners, banners_mobile FROM public_catalogs WHERE (logo_url ~* 'product-images/public' OR single_brand_logo_url ~* 'product-images/public' OR ARRAY_TO_STRING(banners, ',') ~* 'product-images/public' OR ARRAY_TO_STRING(banners_mobile, ',') ~* 'product-images/public') LIMIT 50",
      },
    ];

    for (const c of checks) {
      console.log('\n--- ' + c.name + ' ---');
      const res = await client.query(c.q);
      if (res.rows.length === 1 && res.rows[0].cnt !== undefined) {
        console.log('count:', res.rows[0].cnt);
      } else {
        console.table(res.rows);
      }
    }

    if (apply) {
      console.log(
        '\n-- APPLY MODE: running normalization updates (inside transaction) --'
      );
      const tx = await client.query('BEGIN');
      try {
        // Run same normalization as sql/normalize_storage_paths.sql
        await client.query(
          "UPDATE brands SET logo_url = regexp_replace(logo_url, '/?product-images/public/', 'product-images/', 'gi') WHERE logo_url IS NOT NULL AND logo_url ~* 'product-images/public'"
        );
        await client.query(
          "UPDATE brands SET banner_url = regexp_replace(banner_url, '/?product-images/public/', 'product-images/', 'gi') WHERE banner_url IS NOT NULL AND banner_url ~* 'product-images/public'"
        );
        await client.query(
          "UPDATE products SET image_path = regexp_replace(image_path, '/?product-images/public/', 'product-images/', 'gi') WHERE image_path IS NOT NULL AND image_path ~* 'product-images/public'"
        );
        await client.query(
          "UPDATE product_images SET storage_path = regexp_replace(storage_path, '/?product-images/public/', 'product-images/', 'gi') WHERE storage_path IS NOT NULL AND storage_path ~* 'product-images/public'"
        );
        await client.query(
          "UPDATE public_catalogs SET logo_url = regexp_replace(logo_url, '/?product-images/public/', 'product-images/', 'gi') WHERE logo_url IS NOT NULL AND logo_url ~* 'product-images/public'"
        );
        await client.query(
          "UPDATE public_catalogs SET single_brand_logo_url = regexp_replace(single_brand_logo_url, '/?product-images/public/', 'product-images/', 'gi') WHERE single_brand_logo_url IS NOT NULL AND single_brand_logo_url ~* 'product-images/public'"
        );

        // Normalize array elements for banners
        await client.query(`
          UPDATE public_catalogs
          SET banners = (
            SELECT array_agg(regexp_replace(b, '/?product-images/public/', 'product-images/', 'gi'))
            FROM unnest(banners) b
          )
          WHERE banners IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(banners) b WHERE b ~* 'product-images/public')
        `);

        await client.query(`
          UPDATE public_catalogs
          SET banners_mobile = (
            SELECT array_agg(regexp_replace(b, '/?product-images/public/', 'product-images/', 'gi'))
            FROM unnest(banners_mobile) b
          )
          WHERE banners_mobile IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(banners_mobile) b WHERE b ~* 'product-images/public')
        `);

        await client.query('COMMIT');
        console.log('Normalization applied successfully.');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying normalization, rolled back.', err);
      }
    } else {
      console.log(
        '\nRun with --apply to execute normalization updates. Example:'
      );
      console.log(
        '  DATABASE_URL=postgres://... node scripts/check_and_normalize_paths.js --apply'
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
