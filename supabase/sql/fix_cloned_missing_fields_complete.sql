-- Fix cloned products that have NULL/empty business fields by copying from source product
-- Run this as an admin/service-role in Supabase SQL Editor.
-- Preview rows BEFORE running the UPDATE by executing the SELECT block first.

-- ===================== PREVIEW =====================
-- Shows up to 50 cloned products that appear to be missing key fields
SELECT cc.cloned_product_id AS target_id,
       cc.source_product_id AS source_id,
       tgt.slug AS target_slug,
       src.slug AS source_slug,
       tgt.user_id AS target_user,
       src.user_id AS source_user,
       tgt.name AS target_name,
       src.name AS source_name
FROM public.catalog_clones cc
JOIN public.products tgt ON tgt.id = cc.cloned_product_id
JOIN public.products src ON src.id = cc.source_product_id
WHERE (
  tgt.name IS NULL OR tgt.name = ''
  OR tgt.description IS NULL OR tgt.description = ''
  OR tgt.brand IS NULL OR tgt.brand = ''
  OR tgt.price IS NULL
  OR tgt.image_url IS NULL OR tgt.image_url = ''
  OR tgt.category_id IS NULL
  OR tgt.images IS NULL OR (jsonb_typeof(tgt.images) = 'array' AND jsonb_array_length(tgt.images) = 0)
  OR tgt.image_variants IS NULL OR (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) = 0)
  OR tgt.gallery_images IS NULL OR (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) = 0)
  OR tgt.sku IS NULL OR tgt.sku = ''
  OR tgt.barcode IS NULL OR tgt.barcode = ''
  OR tgt.category IS NULL OR tgt.category = ''
  OR tgt.original_price IS NULL
  OR tgt.technical_specs IS NULL OR tgt.technical_specs = ''
  OR tgt.discount_percent IS NULL
  OR tgt.stock_quantity IS NULL
  OR tgt.track_stock IS NULL
  OR tgt.is_active IS NULL
  OR tgt.external_image_url IS NULL OR tgt.external_image_url = ''
  OR tgt.image_path IS NULL OR tgt.image_path = ''
  OR tgt.short_id IS NULL OR tgt.short_id = ''
  OR tgt.last_import_id IS NULL
  OR tgt.sale_price IS NULL
  OR tgt.min_stock_level IS NULL
  OR tgt.manage_stock IS NULL
  OR tgt.image_optimized IS NULL
  OR tgt.cost IS NULL
  OR tgt.image_is_shared IS NULL
  OR tgt.sync_status IS NULL OR tgt.sync_status = ''
  OR tgt.sync_error IS NULL OR tgt.sync_error = ''
  OR tgt.original_size_kb IS NULL
  OR tgt.optimized_size_kb IS NULL
  OR tgt.class_core IS NULL OR tgt.class_core = ''
)
LIMIT 50;

-- ===================== UPDATE =====================
-- Wrap in transaction so you can review PREVIEW then run UPDATE
BEGIN;
WITH to_fix AS (
  SELECT cc.cloned_product_id, cc.source_product_id
  FROM public.catalog_clones cc
  JOIN public.products tgt ON tgt.id = cc.cloned_product_id
  WHERE (
    tgt.name IS NULL OR tgt.name = ''
    OR tgt.description IS NULL OR tgt.description = ''
    OR tgt.brand IS NULL OR tgt.brand = ''
    OR tgt.price IS NULL
    OR tgt.image_url IS NULL OR tgt.image_url = ''
    OR tgt.category_id IS NULL
    OR tgt.images IS NULL OR (jsonb_typeof(tgt.images) = 'array' AND jsonb_array_length(tgt.images) = 0)
    OR tgt.image_variants IS NULL OR (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) = 0)
    OR tgt.gallery_images IS NULL OR (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) = 0)
    OR tgt.sku IS NULL OR tgt.sku = ''
    OR tgt.barcode IS NULL OR tgt.barcode = ''
    OR tgt.category IS NULL OR tgt.category = ''
    OR tgt.original_price IS NULL
    OR tgt.technical_specs IS NULL OR tgt.technical_specs = ''
    OR tgt.discount_percent IS NULL
    OR tgt.stock_quantity IS NULL
    OR tgt.track_stock IS NULL
    OR tgt.is_active IS NULL
    OR tgt.external_image_url IS NULL OR tgt.external_image_url = ''
    OR tgt.image_path IS NULL OR tgt.image_path = ''
    OR tgt.short_id IS NULL OR tgt.short_id = ''
    OR tgt.last_import_id IS NULL
    OR tgt.sale_price IS NULL
    OR tgt.min_stock_level IS NULL
    OR tgt.manage_stock IS NULL
    OR tgt.image_optimized IS NULL
    OR tgt.cost IS NULL
    OR tgt.image_is_shared IS NULL
    OR tgt.sync_status IS NULL OR tgt.sync_status = ''
    OR tgt.sync_error IS NULL OR tgt.sync_error = ''
    OR tgt.original_size_kb IS NULL
    OR tgt.optimized_size_kb IS NULL
    OR tgt.class_core IS NULL OR tgt.class_core = ''
  )
)
UPDATE public.products tgt
SET
  reference_code = COALESCE(NULLIF(trim(tgt.reference_code), ''), src.reference_code),
  name = COALESCE(NULLIF(trim(tgt.name), ''), src.name),
  description = COALESCE(NULLIF(trim(tgt.description), ''), src.description),
  brand = COALESCE(NULLIF(trim(tgt.brand), ''), src.brand),
  price = COALESCE(tgt.price, src.price),
  image_url = COALESCE(NULLIF(trim(tgt.image_url), ''), src.image_url),
  bestseller = COALESCE(tgt.bestseller, src.bestseller),
  is_launch = COALESCE(tgt.is_launch, src.is_launch),
  category_id = COALESCE(tgt.category_id, src.category_id),
  images = COALESCE(tgt.images, src.images),
  is_best_seller = COALESCE(tgt.is_best_seller, src.is_best_seller),
  category = COALESCE(NULLIF(trim(tgt.category), ''), src.category),
  original_price = COALESCE(tgt.original_price, src.original_price),
  technical_specs = COALESCE(NULLIF(trim(tgt.technical_specs), ''), src.technical_specs),
  discount_percent = COALESCE(tgt.discount_percent, src.discount_percent),
  stock_quantity = COALESCE(tgt.stock_quantity, src.stock_quantity),
  track_stock = COALESCE(tgt.track_stock, src.track_stock),
  sku = COALESCE(NULLIF(trim(tgt.sku), ''), src.sku),
  barcode = COALESCE(NULLIF(trim(tgt.barcode), ''), src.barcode),
  color = COALESCE(NULLIF(trim(tgt.color), ''), src.color),
  is_active = COALESCE(tgt.is_active, src.is_active),
  external_image_url = COALESCE(NULLIF(trim(tgt.external_image_url), ''), src.external_image_url),
  image_path = COALESCE(NULLIF(trim(tgt.image_path), ''), src.image_path),
  short_id = COALESCE(NULLIF(trim(tgt.short_id), ''), src.short_id),
  last_import_id = COALESCE(tgt.last_import_id, src.last_import_id),
  sale_price = COALESCE(tgt.sale_price, src.sale_price),
  min_stock_level = COALESCE(tgt.min_stock_level, src.min_stock_level),
  manage_stock = COALESCE(tgt.manage_stock, src.manage_stock),
  image_optimized = COALESCE(tgt.image_optimized, src.image_optimized),
  cost = COALESCE(tgt.cost, src.cost),
  original_product_id = COALESCE(tgt.original_product_id, src.original_product_id),
  image_is_shared = COALESCE(tgt.image_is_shared, src.image_is_shared),
  sync_status = COALESCE(NULLIF(trim(tgt.sync_status), ''), src.sync_status),
  sync_error = COALESCE(NULLIF(trim(tgt.sync_error), ''), src.sync_error),
  original_size_kb = COALESCE(tgt.original_size_kb, src.original_size_kb),
  optimized_size_kb = COALESCE(tgt.optimized_size_kb, src.optimized_size_kb),
  class_core = COALESCE(NULLIF(trim(tgt.class_core), ''), src.class_core),
  image_variants = (
    CASE
      WHEN tgt.image_variants IS NULL OR (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) = 0)
      THEN (
        SELECT COALESCE(jsonb_agg(
          CASE
            WHEN jsonb_typeof(elem) = 'object' THEN (elem || jsonb_build_object('product_code', src.short_id))
            ELSE elem
          END
        ), src.image_variants)
        FROM jsonb_array_elements(COALESCE(src.image_variants, '[]'::jsonb)) AS elem
      )
      ELSE tgt.image_variants
    END
  ),
  gallery_images = (
    CASE
      WHEN tgt.gallery_images IS NULL OR (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) = 0)
      THEN (
        SELECT COALESCE(jsonb_agg(
          CASE
            WHEN jsonb_typeof(elem) = 'object' THEN (elem || jsonb_build_object('product_code', src.short_id))
            ELSE elem
          END
        ), src.gallery_images)
        FROM jsonb_array_elements(COALESCE(src.gallery_images, '[]'::jsonb)) AS elem
      )
      ELSE tgt.gallery_images
    END
  ),
  updated_at = now()
FROM to_fix f
JOIN public.products src ON src.id = f.source_product_id
WHERE tgt.id = f.cloned_product_id
RETURNING tgt.id AS fixed_product_id, tgt.slug, tgt.user_id;

COMMIT;

-- End of script
