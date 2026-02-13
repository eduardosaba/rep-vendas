-- Migration: create/replace clone_catalog_smart with shared-image semantics
-- - Marks cloned rows with image_is_shared = TRUE
-- - Generates stable unique slug by appending a short target_user_id + row_number
-- - Inserts mapping rows into catalog_clones with source/cloned ids

CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id UUID,
  target_user_id UUID,
  brands_to_copy TEXT[]
)
RETURNS TABLE (products_added INT) AS $$
DECLARE
  v_count INT;
BEGIN
  WITH src AS (
    SELECT p.*,
           -- compute base_slug (existing slug or derived from name)
           (CASE WHEN COALESCE(p.slug, '') = '' THEN regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') ELSE p.slug END) AS base_slug
    FROM public.products p
    WHERE p.user_id = source_user_id
      AND p.brand = ANY(brands_to_copy)
      AND NOT EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.reference_code = p.reference_code
          AND p2.brand = p.brand
      )
  ), numbered AS (
    -- assign sequential suffix per base_slug so clones of same slug get -1,-2,...
    SELECT s.*, row_number() OVER (PARTITION BY s.base_slug ORDER BY s.id) AS rn
    FROM src s
  ), ins AS (
    INSERT INTO public.products (
      reference_code, name, description, brand, category, category_id,
      slug,
      price, original_price, sale_price, cost, discount_percent,
      image_url, external_image_url, image_path, images, gallery_images,
      image_variants, image_optimized, image_is_shared,
      is_active, is_launch, is_best_seller, bestseller,
      technical_specs, stock_quantity, track_stock, manage_stock,
      min_stock_level, sku, barcode, color, class_core, short_id,
      original_product_id, sync_status, user_id
    )
    SELECT
      s.reference_code, s.name, s.description, s.brand, s.category, s.category_id,
      -- slug: normalize base and append a numeric suffix that won't collide with existing slugs
      (regexp_replace(s.base_slug, '-+', '-', 'g')) || '-' || (m.max_suffix + s.rn)::text,
      s.price, s.original_price, s.sale_price, s.cost, s.discount_percent,
      s.image_url, s.external_image_url, s.image_path, s.images, s.gallery_images,
      s.image_variants, s.image_optimized, TRUE,
      s.is_active, s.is_launch, s.is_best_seller, s.bestseller,
      s.technical_specs, s.stock_quantity, s.track_stock, s.manage_stock,
      s.min_stock_level, s.sku, s.barcode, s.color, s.class_core, s.short_id,
      s.id, 'synced', target_user_id
    FROM numbered s
    LEFT JOIN LATERAL (
      SELECT COALESCE(MAX((substring(p.slug FROM '-(\\d+)$'))::int), 0) AS max_suffix
      FROM public.products p
      WHERE p.user_id = target_user_id
        AND p.slug LIKE s.base_slug || '-%'
    ) m ON true
    RETURNING id AS cloned_product_id, original_product_id
  )
  INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
  SELECT original_product_id, cloned_product_id, source_user_id, target_user_id, now()
  FROM ins;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: run this migration in Supabase SQL editor as a master user. The function uses SECURITY DEFINER
-- so callers do not need direct write perms on products/catalog_clones when executed via the service role.
