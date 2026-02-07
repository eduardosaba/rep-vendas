-- Migration: Add missing product fields to clone_catalog_smart
-- Date: 2026-02-07
-- Purpose: Include barcode, technical_specs, and color when cloning products

DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid, text[]);

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
  final_image_url text;
  final_external_image_url text;
BEGIN
  FOR src IN
    SELECT * FROM public.products p
    WHERE p.user_id = source_user_id
      AND (brands_to_copy IS NULL OR p.brand = ANY(brands_to_copy))
      AND (p.is_active IS DISTINCT FROM FALSE)
  LOOP
    -- Skip if target already has the same reference_code
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

    -- Clean up image fields logic:
    -- If image_path or images exist, clear external_image_url and image_url
    -- to avoid duplicates in gallery (image_path takes priority)
    IF src.image_path IS NOT NULL OR (src.images IS NOT NULL AND array_length(src.images, 1) > 0) THEN
      final_image_url := NULL;
      final_external_image_url := NULL;
    ELSE
      -- If no internal storage reference, keep external URLs as fallback
      final_image_url := src.image_url;
      final_external_image_url := src.external_image_url;
    END IF;

    INSERT INTO public.products (
      name, reference_code, brand, category, description,
      price, sale_price, cost, external_image_url, image_url,
      image_path, images, user_id, image_is_shared, created_at, updated_at,
      -- ✅ Campos adicionais solicitados
      barcode, technical_specs, color,
      -- ✅ Flags e metadados
      bestseller, is_launch, is_best_seller,
      -- ✅ Campos de sincronização
      sync_status, sync_error, original_size_kb, optimized_size_kb, image_optimized,
      -- ✅ Rastreamento
      original_product_id, is_active
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description,
      src.price, src.sale_price, src.cost, 
      final_external_image_url, 
      final_image_url,
      src.image_path, 
      src.images, 
      target_user_id, 
      true,
      now(), 
      now(),
      -- ✅ Campos adicionais
      src.barcode, 
      src.technical_specs, 
      src.color,
      -- ✅ Flags
      COALESCE(src.bestseller, false), 
      COALESCE(src.is_launch, false), 
      COALESCE(src.is_best_seller, false),
      -- ✅ Sincronização
      COALESCE(src.sync_status, 'synced'), 
      src.sync_error, 
      src.original_size_kb, 
      src.optimized_size_kb, 
      COALESCE(src.image_optimized, false),
      -- ✅ Rastreamento
      src.id, 
      src.is_active
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);
  END LOOP;
  
  -- Return reliable total by counting catalog_clones for this source/target
  RETURN QUERY
    SELECT COUNT(*)::integer AS copied_count
    FROM public.catalog_clones cc
    WHERE cc.source_user_id = source_user_id
      AND cc.target_user_id = target_user_id
      AND cc.created_at >= now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Notes:
-- - This migration adds barcode, technical_specs, and color to cloned products
-- - These fields preserve product metadata like EAN codes, technical specifications, and color information
-- - The function remains idempotent (skips duplicates based on reference_code)
