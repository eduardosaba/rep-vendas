-- Migration: Normalizar `image_path` removendo prefixo de bucket quando presente
-- Uso: revisar SELECTs primeiro, depois executar o UPDATE se estiver OK.
-- Sempre fazer backup antes de rodar em produção.

-- 1) Preview: exemplos e contagens
SELECT COUNT(*) AS products_with_prefix
FROM products
WHERE image_path IS NOT NULL AND image_path LIKE 'product-images/%';

SELECT id, image_path
FROM products
WHERE image_path IS NOT NULL AND image_path LIKE 'product-images/%'
LIMIT 50;

SELECT COUNT(*) AS product_images_with_prefix
FROM product_images
WHERE url IS NOT NULL AND url LIKE 'product-images/%';

SELECT id, product_id, url
FROM product_images
WHERE url IS NOT NULL AND url LIKE 'product-images/%'
LIMIT 50;

-- 2) Atualização segura (idempotente) — remove o prefixo "product-images/" quando presente
BEGIN;

-- Atualiza products.image_path
UPDATE products
SET image_path = regexp_replace(image_path, '^product-images\/?', '')
WHERE image_path IS NOT NULL AND image_path LIKE 'product-images/%';

-- Atualiza product_images.url (se você armazenou apenas o path em `url`)
UPDATE product_images
SET url = regexp_replace(url, '^product-images\/?', '')
WHERE url IS NOT NULL AND url LIKE 'product-images/%';

COMMIT;

-- 3) Verificação pós-update
SELECT COUNT(*) AS products_with_prefix_after
FROM products
WHERE image_path IS NOT NULL AND image_path LIKE 'product-images/%';

SELECT COUNT(*) AS product_images_with_prefix_after
FROM product_images
WHERE url IS NOT NULL AND url LIKE 'product-images/%';

-- FIM
