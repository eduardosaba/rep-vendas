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
  v_count INT := 0;
  s_row RECORD;
  candidate_slug TEXT;
  max_suffix INT;
  suffix INT;
  cloned_product_id uuid;
BEGIN
  -- Obtain an advisory lock per target_user to prevent concurrent clones
  PERFORM pg_advisory_xact_lock(hashtext(target_user_id::text)::bigint);

  -- Iterate row-by-row to safely compute a unique slug per inserted row
  FOR s_row IN
    SELECT p.*, (CASE WHEN COALESCE(p.slug, '') = '' THEN regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') ELSE p.slug END) AS base_slug
    FROM public.products p
    WHERE p.user_id = source_user_id
      AND p.brand = ANY(brands_to_copy)
      AND NOT EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.reference_code = p.reference_code
          AND p2.brand = p.brand
      )
    ORDER BY p.id
  LOOP
    -- find highest numeric suffix already present for this base_slug in target
    SELECT COALESCE(MAX((substring(p.slug FROM '-(\\d+)$'))::int), 0) INTO max_suffix
    FROM public.products p
    WHERE p.user_id = target_user_id
      AND p.slug LIKE s_row.base_slug || '-%';

    suffix := max_suffix + 1;
    candidate_slug := regexp_replace(s_row.base_slug, '-+', '-', 'g') || '-' || suffix::text;

    -- Try inserting; on unique violation, increment suffix and retry (protects against race conditions)
    LOOP
      BEGIN
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
        VALUES (
          s_row.reference_code, s_row.name, s_row.description, s_row.brand, s_row.category, s_row.category_id,
          candidate_slug,
          s_row.price, s_row.original_price, s_row.sale_price, s_row.cost, s_row.discount_percent,
          s_row.image_url, s_row.external_image_url, s_row.image_path, s_row.images, s_row.gallery_images,
          s_row.image_variants, s_row.image_optimized, TRUE,
          s_row.is_active, s_row.is_launch, s_row.is_best_seller, s_row.bestseller,
          s_row.technical_specs, s_row.stock_quantity, s_row.track_stock, s_row.manage_stock,
          s_row.min_stock_level, s_row.sku, s_row.barcode, s_row.color, s_row.class_core, s_row.short_id,
          s_row.id, 'synced', target_user_id
        )
        RETURNING id INTO cloned_product_id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        -- increment suffix and try a new candidate slug
        suffix := suffix + 1;
        candidate_slug := regexp_replace(s_row.base_slug, '-+', '-', 'g') || '-' || suffix::text;
        -- continue loop and retry
      END;
    END LOOP;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
    VALUES (s_row.id, cloned_product_id, source_user_id, target_user_id, now());

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: run this migration in Supabase SQL editor as a master user. The function uses SECURITY DEFINER
-- so callers do not need direct write perms on products/catalog_clones when executed via the service role.
