-- Migration: Add batch-processing clone function to avoid long-running single transactions
-- Date: 2026-04-25

-- This function processes up to `p_batch_size` products per call.
-- Call repeatedly from the client until `processed_count` = 0.

CREATE OR REPLACE FUNCTION public.clone_catalog_batch(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_brands_to_copy text[],
  p_batch_size int,
  p_last_id uuid
)
RETURNS TABLE(processed_count int, last_processed_id uuid) AS $$
DECLARE
  s_row record;
  cloned_product_id uuid;
  candidate_slug text;
  max_suffix int;
  suffix int;
  cnt int := 0;
BEGIN
  -- Avoid concurrent clones to the same target
  PERFORM pg_advisory_xact_lock(hashtext(p_target_user_id::text)::bigint);
  PERFORM set_config('statement_timeout', '600000', true); -- 10 minutes for batch clone calls

  FOR s_row IN
    SELECT p.*, (CASE WHEN COALESCE(p.slug,'') = '' THEN regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') ELSE p.slug END) AS base_slug
    FROM public.products p
    WHERE p.user_id = p_source_user_id
      AND (p_brands_to_copy IS NULL OR p.brand = ANY(p_brands_to_copy))
      AND (p_last_id IS NULL OR p.id > p_last_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = p_target_user_id
          AND p2.reference_code = p.reference_code
          AND p2.brand = p.brand
      )
    ORDER BY p.id
    LIMIT p_batch_size
  LOOP
    -- compute slug candidate
    SELECT COALESCE(MAX((substring(p.slug FROM '-(\d+)$'))::int), 0) INTO max_suffix
    FROM public.products p
    WHERE p.user_id = p_target_user_id
      AND p.slug LIKE s_row.base_slug || '-%';

    suffix := max_suffix + 1;
    candidate_slug := regexp_replace(s_row.base_slug, '-+', '-', 'g') || '-' || suffix::text;

    LOOP
      BEGIN
        INSERT INTO public.products (
          reference_code, reference_id, name, description, brand, category, category_id,
          slug,
          price, original_price, sale_price, cost, discount_percent,
          image_url, external_image_url, image_path, images, gallery_images,
          image_variants, image_optimized, image_is_shared,
          is_active, is_launch, is_best_seller, bestseller,
          technical_specs, stock_quantity, track_stock, manage_stock,
          min_stock_level, sku, barcode, color, gender, class_core, short_id,
          original_product_id, sync_status, user_id,
          material, polarizado, fotocromatico, material_haste, colecao, frame_formato, color_nome
        )
        VALUES (
          s_row.reference_code, s_row.reference_id, s_row.name, s_row.description, s_row.brand, s_row.category, s_row.category_id,
          candidate_slug,
          s_row.price, s_row.original_price, s_row.sale_price, s_row.cost, s_row.discount_percent,
          s_row.image_url, s_row.external_image_url, s_row.image_path, s_row.images, s_row.gallery_images,
          s_row.image_variants, s_row.image_optimized, TRUE,
          s_row.is_active, s_row.is_launch, s_row.is_best_seller, s_row.bestseller,
          s_row.technical_specs, s_row.stock_quantity, s_row.track_stock, s_row.manage_stock,
          s_row.min_stock_level, s_row.sku, s_row.barcode, s_row.color, s_row.gender, s_row.class_core, s_row.short_id,
          s_row.id, 'synced', p_target_user_id,
          s_row.material, s_row.polarizado, s_row.fotocromatico, s_row.material_haste, s_row.colecao, s_row.frame_formato, s_row.color_nome
        )
        RETURNING id INTO cloned_product_id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        suffix := suffix + 1;
        candidate_slug := regexp_replace(s_row.base_slug, '-+', '-', 'g') || '-' || suffix::text;
      END;
    END LOOP;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
    VALUES (s_row.id, cloned_product_id, p_source_user_id, p_target_user_id, now());

    cnt := cnt + 1;
    last_processed_id := s_row.id;
  END LOOP;

  processed_count := cnt;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
