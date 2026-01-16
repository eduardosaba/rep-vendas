-- Migration: create clone_catalog_smart function
-- Date: 2026-01-15

-- Function: clone_catalog_smart(source_user_id uuid, target_user_id uuid, brands_to_copy text[])
-- Behavior:
--  - Clone only active products from source (treat NULL as active)
--  - Skip products whose reference_code already exists for the target (idempotent by reference_code)
--  - Mark cloned rows with image_is_shared = true to enable copy-on-write
--  - Record mapping in catalog_clones table

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
      image_path, images, user_id, image_is_shared, created_at, updated_at
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description,
      src.price, src.sale_price, src.cost, src.external_image_url, src.image_url,
      src.image_path, src.images, target_user_id, true, now(), now()
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);
  END LOOP;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RETURN QUERY SELECT inserted_rows;
END;
$$ LANGUAGE plpgsql;
