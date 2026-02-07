-- Migration: Cleanup invalid entries inside products.images (jsonb array)
-- Date: 2026-02-07
-- Purpose: Remove null/empty/'null' or very short string entries from the JSONB `images` array
-- Safety: creates a backup table with the previous `images` for affected products

BEGIN;

-- 1) Create backup table (only once)
CREATE TABLE IF NOT EXISTS public.products_images_backup (
  product_id uuid PRIMARY KEY,
  images_before jsonb,
  backed_up_at timestamptz DEFAULT now()
);

-- 2) Build condition for affected products and use it inline for backup and update
-- Condition: images is an array and contains null/short/'null' string entries
-- 3) Backup existing images for affected products (using same condition)
INSERT INTO public.products_images_backup (product_id, images_before)
SELECT p.id, p.images
FROM public.products p
WHERE p.images IS NOT NULL
  AND jsonb_typeof(p.images) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.images) AS arr(elem)
    WHERE
      jsonb_typeof(arr.elem) = 'null'
      OR (
        jsonb_typeof(arr.elem) = 'string'
        AND length(trim(both '"' FROM arr.elem::text)) < 10
      )
      OR (
        jsonb_typeof(arr.elem) = 'string'
        AND lower(trim(both '"' FROM arr.elem::text)) LIKE '%null%'
      )
  )
ON CONFLICT (product_id) DO NOTHING;

-- 4) Perform safe cleanup: rebuild the images array excluding invalid entries
UPDATE public.products p
SET
  images = (
    SELECT COALESCE(jsonb_agg(clean_elem), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN to_jsonb(trim(both '"' FROM elem::text))
          ELSE elem
        END AS clean_elem
      FROM jsonb_array_elements(p.images) AS elem
      WHERE NOT (
        jsonb_typeof(elem) = 'null'
        OR (jsonb_typeof(elem) = 'string' AND length(trim(both '"' FROM elem::text)) < 10)
        OR (jsonb_typeof(elem) = 'string' AND lower(trim(both '"' FROM elem::text)) LIKE '%null%')
      )
    ) t
  ),
  updated_at = now()
WHERE p.images IS NOT NULL
  AND jsonb_typeof(p.images) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.images) AS arr(elem)
    WHERE
      jsonb_typeof(arr.elem) = 'null'
      OR (
        jsonb_typeof(arr.elem) = 'string'
        AND length(trim(both '"' FROM arr.elem::text)) < 10
      )
      OR (
        jsonb_typeof(arr.elem) = 'string'
        AND lower(trim(both '"' FROM arr.elem::text)) LIKE '%null%'
      )
  );

COMMIT;

-- Notes:
-- - This migration is idempotent: products without invalid entries are not updated.
-- - A backup of affected rows is stored in `public.products_images_backup`.
-- - Test in staging before applying to production.

-- Rollback guidance (manual):
-- To restore a product's images from backup:
-- UPDATE public.products p
-- SET images = b.images_before, updated_at = now()
-- FROM public.products_images_backup b
-- WHERE p.id = b.product_id AND b.product_id = '<THE_PRODUCT_UUID>';
