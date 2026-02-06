-- Migration: fix clone_catalog_smart parameter names to avoid ambiguous column refs
-- Date: 2026-02-05

-- This replaces the existing `clone_catalog_smart` function to use
-- parameter names that won't collide with table column names.

-- Drop existing function with same signature first (parameter names cannot be changed
-- using CREATE OR REPLACE). This makes the migration idempotent when run on a DB
-- that still has the old function.
DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid, text[]);

CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_brands_to_copy text[]
)
RETURNS TABLE (copied_count integer) AS $$
DECLARE
  inserted_rows integer;
  src record;
  new_id uuid;
BEGIN
  -- Copy distinct brands from source to target, preserving logo/banner/description when present.
  -- This inserts only brands that the target does not already have.
  INSERT INTO public.brands (id, name, logo_url, banner_url, logo_path, banner_path, description, user_id)
  SELECT
    gen_random_uuid(),
    s.brand,
    b.logo_url,
    b.banner_url,
    -- extract internal storage path from public url when available
    CASE WHEN b.logo_url IS NOT NULL AND b.logo_url LIKE '%/storage/v1/object/public/%' THEN substring(b.logo_url FROM '/storage/v1/object/public/(.*)$') ELSE NULL END,
    CASE WHEN b.banner_url IS NOT NULL AND b.banner_url LIKE '%/storage/v1/object/public/%' THEN substring(b.banner_url FROM '/storage/v1/object/public/(.*)$') ELSE NULL END,
    b.description,
    p_target_user_id
  FROM (
    SELECT DISTINCT TRIM(brand) AS brand
    FROM public.products
    WHERE user_id = p_source_user_id
      AND brand IS NOT NULL
      AND TRIM(brand) <> ''
  ) s
  LEFT JOIN public.brands b
    ON b.user_id = p_source_user_id AND b.name = s.brand
  WHERE NOT EXISTS (
    SELECT 1 FROM public.brands tb
    WHERE tb.user_id = p_target_user_id AND tb.name = s.brand
  );

  FOR src IN
    SELECT * FROM public.products p
    WHERE p.user_id = p_source_user_id
      AND (p_brands_to_copy IS NULL OR p.brand = ANY(p_brands_to_copy))
      AND (p.is_active IS DISTINCT FROM FALSE)
  LOOP
    IF src.reference_code IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = p_target_user_id
          AND p2.reference_code = src.reference_code
      ) THEN
        CONTINUE;
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = p_target_user_id
          AND p2.name = src.name
          AND p2.brand = src.brand
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.products (
      name, reference_code, brand, category, description,
      price, sale_price, cost, external_image_url, image_url,
      image_path, images, user_id, image_is_shared, created_at, updated_at, original_product_id, is_active,
      bestseller, is_launch, is_best_seller,
      sync_status, sync_error, original_size_kb, optimized_size_kb, image_optimized
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description,
      src.price, src.sale_price, src.cost, src.external_image_url, src.image_url,
      src.image_path, src.images, p_target_user_id, true, now(), now(), src.id, src.is_active,
      COALESCE(src.bestseller, false), COALESCE(src.is_launch, false), COALESCE(src.is_best_seller, false),
      COALESCE(src.sync_status, 'synced'), src.sync_error, src.original_size_kb, src.optimized_size_kb, COALESCE(src.image_optimized, false)
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, p_source_user_id, p_target_user_id);

    INSERT INTO public.product_images (product_id, url, is_primary, position, sync_status, sync_error, optimized_url, created_at, updated_at)
    SELECT
      new_id,
      pi.url,
      pi.is_primary,
      pi.position,
      COALESCE(pi.sync_status, 'synced'),
      pi.sync_error,
      pi.optimized_url,
      now(), now()
    FROM public.product_images pi
    WHERE pi.product_id = src.id
      AND NOT EXISTS (
        SELECT 1 FROM public.product_images tpi WHERE tpi.product_id = new_id AND tpi.url = pi.url
      );
  END LOOP;

  RETURN QUERY
    SELECT COUNT(*)::integer AS copied_count
    FROM public.catalog_clones cc
    WHERE cc.source_user_id = p_source_user_id
      AND cc.target_user_id = p_target_user_id
      AND cc.created_at >= now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
