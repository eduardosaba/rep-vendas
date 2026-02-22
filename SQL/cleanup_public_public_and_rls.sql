-- Migration: cleanup 'public/public/' entries and ensure RLS policies reference user_id
-- WARNING: Revise e faça backup antes de executar em produção.
-- Suggested workflow: run the SELECT checks first, then run the UPDATEs.

-- 0) Verify affected rows counts
SELECT
  (SELECT count(*) FROM products WHERE image_path LIKE '%public/public/%') AS image_path_count,
  (SELECT count(*) FROM products WHERE image_url LIKE '%public/public/%') AS image_url_count,
  (SELECT count(*) FROM products WHERE external_image_url LIKE '%public/public/%') AS external_image_url_count,
  (SELECT count(*) FROM products WHERE gallery_images::text LIKE '%public/public/%') AS gallery_images_count,
  (SELECT count(*) FROM products WHERE image_variants::text LIKE '%public/public/%') AS image_variants_count,
  (SELECT count(*) FROM products WHERE linked_images::text LIKE '%public/public/%') AS linked_images_count,
  (SELECT count(*) FROM products WHERE images::text LIKE '%public/public/%') AS images_count;

-- 1) Check datatype of suspect columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('image_path','image_url','external_image_url','gallery_images','image_variants','linked_images','images');

-- 2) (Optional) Drop old policies that may reference `owner_id`
DROP POLICY IF EXISTS select_own_products ON products;
DROP POLICY IF EXISTS update_own_products ON products;
DROP POLICY IF EXISTS insert_products ON products;
DROP POLICY IF EXISTS delete_own_products ON products;

-- 3) Enable RLS (idempotent if already enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4) Create policies that use `user_id` as owner column
CREATE POLICY select_own_products ON products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY update_own_products ON products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY insert_products ON products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_products ON products
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5) Fix text columns that may contain 'public/public/'
-- 5) Fix text columns that may contain 'public/public/'
UPDATE products SET image_path = replace(image_path, 'public/public/', 'public/') WHERE image_path LIKE '%public/public/%';
UPDATE products SET image_url = replace(image_url, 'public/public/', 'public/') WHERE image_url LIKE '%public/public/%';
UPDATE products SET external_image_url = replace(external_image_url, 'public/public/', 'public/') WHERE external_image_url LIKE '%public/public/%';

-- 6) Fix JSONB columns by casting to text, replacing, then casting back
-- Use regexp_replace with global flag to replace all occurrences

UPDATE products 
SET gallery_images = (regexp_replace(gallery_images::text, 'public/public/', 'public/', 'g'))::jsonb 
WHERE gallery_images::text LIKE '%public/public/%';

UPDATE products 
SET image_variants = (regexp_replace(image_variants::text, 'public/public/', 'public/', 'g'))::jsonb 
WHERE image_variants::text LIKE '%public/public/%';

UPDATE products 
SET images = (regexp_replace(images::text, 'public/public/', 'public/', 'g'))::jsonb 
WHERE images::text LIKE '%public/public/%';

-- 7) Coluna de ARRAY DE TEXTO (linked_images)
UPDATE products 
SET linked_images = (regexp_replace(linked_images::text, 'public/public/', 'public/', 'g'))::text[]
WHERE linked_images::text LIKE '%public/public/%';

-- 7) Sanity checks after update
SELECT
  (SELECT count(*) FROM products WHERE image_path LIKE '%public/public/%') AS image_path_count_after,
  (SELECT count(*) FROM products WHERE gallery_images::text LIKE '%public/public/%') AS gallery_images_count_after,
  (SELECT count(*) FROM products WHERE image_variants::text LIKE '%public/public/%') AS image_variants_count_after;

-- 8) Notes
-- - If some JSONB columns are actually text in your schema, adapt the casting accordingly or run a targeted UPDATE.
-- - If you have other tables that reference storage paths (eg. catalogs, banners), run similar checks on those tables.
-- - Always run in a transaction or snapshot backup for production safety.

-- End of migration
