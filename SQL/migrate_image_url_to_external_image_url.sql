-- Migration: migrate_image_url_to_external_image_url.sql
-- Copies existing image_url values into external_image_url for products
-- where external_image_url is NULL and image_path is not set.
-- Run this in Supabase SQL Editor.

-- Preview how many rows would be affected
SELECT count(*) AS to_migrate
FROM products
WHERE (external_image_url IS NULL OR external_image_url = '')
  AND (image_path IS NULL OR image_path = '')
  AND (image_url IS NOT NULL AND image_url != '');

-- If output looks correct, run the update:
UPDATE products
SET external_image_url = image_url
WHERE (external_image_url IS NULL OR external_image_url = '')
  AND (image_path IS NULL OR image_path = '')
  AND (image_url IS NOT NULL AND image_url != '');

-- Verify a sample
SELECT id, name, reference_code, image_url, external_image_url, image_path
FROM products
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
