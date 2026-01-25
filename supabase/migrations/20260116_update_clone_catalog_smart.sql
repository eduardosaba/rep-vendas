-- Migration: update clone_catalog_smart to populate original_product_id on cloned products
-- Date: 2026-01-16

-- This replaces the existing clone_catalog_smart implementation with a version
-- that sets products.original_product_id when inserting clones.
CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id uuid,
  target_user_id uuid,
  brands_to_copy text[]
)
RETURNS TABLE (copied_count integer) AS $$
DECLARE
  inserted_rows integer;
  src record;
  new_id uuid;
BEGIN
  FOR src IN
    SELECT * FROM public.products p
    WHERE p.user_id = source_user_id
      AND (brands_to_copy IS NULL OR p.brand = ANY(brands_to_copy))
      AND (p.is_active IS DISTINCT FROM FALSE)
  LOOP
    -- Skip if target already has the same reference_code (if reference_code is null, fall back to comparing name+brand)
    IF src.reference_code IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.reference_code = src.reference_code
      ) THEN
        CONTINUE;
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
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
      -- product flags
      bestseller, is_launch, is_best_seller,
      -- sync/optimization metadata
      sync_status, sync_error, original_size_kb, optimized_size_kb, image_optimized
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description,
      src.price, src.sale_price, src.cost, src.external_image_url, src.image_url,
      src.image_path, src.images, target_user_id, true, now(), now(), src.id, src.is_active,
      -- copy flags (fall back to false when null)
      COALESCE(src.bestseller, false), COALESCE(src.is_launch, false), COALESCE(src.is_best_seller, false),
      -- copy sync/optimization metadata from source to avoid reprocessing already-optimized images
      COALESCE(src.sync_status, 'synced'), src.sync_error, src.original_size_kb, src.optimized_size_kb, COALESCE(src.image_optimized, false)
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);

    -- Copy gallery images (product_images) from source to clone, preserving sync metadata.
    -- Avoid inserting duplicates by checking url for the new product.
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
  -- compute total inserted rows reliably (increment per insertion)
  -- NOTE: ROW_COUNT inside loop only reflects last statement; use counting
  -- by querying catalog_clones for this run would be possible but here we
  -- return the total number of cloned rows inserted during this function
  -- by selecting count from catalog_clones for this source/target pair.
  RETURN QUERY
    SELECT COUNT(*)::integer AS copied_count
    FROM public.catalog_clones cc
    WHERE cc.source_user_id = source_user_id
      AND cc.target_user_id = target_user_id
      AND cc.created_at >= now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
