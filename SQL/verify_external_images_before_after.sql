-- Verificações antes/depois da migration
-- Use "psql $DATABASE_URL -f SQL/verify_external_images_before_after.sql" ou copie as queries individualmente.

-- 1) Resumo geral
SELECT
  (SELECT COUNT(*) FROM products WHERE image_url LIKE 'http%' AND image_url NOT ILIKE '%/storage/v1/object%') AS products_external,
  (SELECT COUNT(*) FROM products WHERE image_path IS NOT NULL OR image_url ILIKE '%/storage/v1/object%') AS products_internal,
  (SELECT COUNT(*) FROM product_images WHERE url LIKE 'http%' AND url NOT ILIKE '%/storage/v1/object%') AS product_images_external;

-- 2) Produtos externos sem status apropriado (amostra)
SELECT id, slug, image_url, sync_status, updated_at
FROM products
WHERE image_url LIKE 'http%'
  AND image_url NOT ILIKE '%/storage/v1/object%'
  AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'))
ORDER BY updated_at DESC
LIMIT 100;

-- 3) Produtos externos marcados como 'synced' (possível falso-positivo)
SELECT id, slug, image_url, sync_status, updated_at
FROM products
WHERE image_url LIKE 'http%'
  AND image_url NOT ILIKE '%/storage/v1/object%'
  AND sync_status = 'synced'
ORDER BY updated_at DESC
LIMIT 100;

-- 4) Product_images externas sem status apropriado (amostra)
SELECT id, product_id, url, optimized_url, sync_status, created_at
FROM product_images
WHERE url LIKE 'http%'
  AND url NOT ILIKE '%/storage/v1/object%'
  AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'))
ORDER BY created_at DESC
LIMIT 200;

-- 5) Contagens que a migration irá alterar (antes)
SELECT
  (SELECT COUNT(*) FROM products WHERE image_url LIKE 'http%' AND image_url NOT ILIKE '%/storage/v1/object%' AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'))) AS products_to_mark_pending,
  (SELECT COUNT(*) FROM product_images WHERE url LIKE 'http%' AND url NOT ILIKE '%/storage/v1/object%' AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'))) AS product_images_to_mark_pending;

-- 6) Verificação rápida após a migration: quantos foram marcados
SELECT
  (SELECT COUNT(*) FROM products WHERE sync_status = 'pending' AND image_url LIKE 'http%' AND image_url NOT ILIKE '%/storage/v1/object%') AS products_now_pending,
  (SELECT COUNT(*) FROM product_images WHERE sync_status = 'pending' AND url LIKE 'http%' AND url NOT ILIKE '%/storage/v1/object%') AS product_images_now_pending;

-- FIM
