-- Fix gallery_images arrays that are only JSON nulls (e.g. [null] or [null,null])
-- Replaces those arrays by the source product's gallery_images and injects
-- `product_code` = source.short_id into each object element.
-- Run as admin/service-role in Supabase SQL Editor.

-- ===================== PREVIEW =====================
-- Shows candidate cloned products where gallery_images is an array of only JSON nulls
SELECT
  tgt.id AS target_id,
  cc.source_product_id AS source_id,
  tgt.user_id AS target_user,
  tgt.gallery_images AS target_gallery,
  src.gallery_images AS source_gallery,
  src.short_id AS source_short_id
FROM public.products tgt
JOIN public.catalog_clones cc ON cc.cloned_product_id = tgt.id
JOIN public.products src ON src.id = cc.source_product_id
WHERE tgt.gallery_images IS NOT NULL
  AND jsonb_typeof(tgt.gallery_images) = 'array'
  -- no element different from JSON null
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(tgt.gallery_images) e WHERE e <> 'null'::jsonb
  )
LIMIT 200;

-- ===================== UPDATE =====================
-- Wrap in transaction; run PREVIEW first and inspect rows.
BEGIN;
WITH to_fix AS (
  SELECT
    tgt.id AS target_id,
    cc.source_product_id
  FROM public.products tgt
  JOIN public.catalog_clones cc ON cc.cloned_product_id = tgt.id
  WHERE tgt.gallery_images IS NOT NULL
    AND jsonb_typeof(tgt.gallery_images) = 'array'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(tgt.gallery_images) e WHERE e <> 'null'::jsonb
    )
)
UPDATE public.products tgt
SET gallery_images = (
  -- build array from source; ensure each object receives product_code = src.short_id
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'object' THEN (elem || jsonb_build_object('product_code', src.short_id))
      ELSE elem
    END
  ), src.gallery_images)
  FROM jsonb_array_elements(COALESCE(src.gallery_images, '[]'::jsonb)) AS elem
)
FROM to_fix f
JOIN public.products src ON src.id = f.source_product_id
WHERE tgt.id = f.target_id
RETURNING tgt.id AS fixed_product_id, tgt.user_id;

COMMIT;

-- End of file
