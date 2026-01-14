-- Migration: create catalog_clones table and clone_catalog_by_brand function

-- 1) catalog_clones mapping table
CREATE TABLE IF NOT EXISTS public.catalog_clones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid NOT NULL,
  cloned_product_id uuid NOT NULL,
  source_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2) Function to clone products by brand from source user to target user
CREATE OR REPLACE FUNCTION public.clone_catalog_by_brand(
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
    SELECT * FROM public.products
    WHERE user_id = source_user_id AND (brands_to_copy IS NULL OR brand = ANY(brands_to_copy))
  LOOP
    INSERT INTO public.products (
      name, reference_code, brand, category, description, price,
      external_image_url, image_url, image_path, images, user_id, created_at, updated_at
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description, src.price,
      src.external_image_url, src.image_url, src.image_path, src.images, target_user_id, now(), now()
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);
  END LOOP;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RETURN QUERY SELECT inserted_rows;
END;
$$ LANGUAGE plpgsql;

-- Note: adjust columns inserted above to match your products schema (image fields, extras)
