-- Migration: fix clone_catalog_smart to include missing columns
-- Date: 2026-01-18
-- Missing columns added: technical_specs, sku, barcode, color, sale_price override check

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
      -- Fallback: check by name + brand if reference_code is missing
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.name = src.name
          AND p2.brand = src.brand
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- INSERT with all columns including technical_specs, sku, barcode, color
    INSERT INTO public.products (
      name, 
      reference_code, 
      sku,
      barcode,
      brand, 
      category, 
      color,
      description,
      technical_specs,
      price, 
      sale_price, 
      cost, 
      external_image_url, 
      image_url, 
      image_path, 
      images, 
      user_id, 
      image_is_shared, 
      created_at, 
      updated_at, 
      original_product_id, 
      is_active
    ) VALUES (
      src.name, 
      src.reference_code, 
      src.sku,
      src.barcode,
      src.brand, 
      src.category, 
      src.color,
      src.description,
      src.technical_specs,
      src.price, 
      src.sale_price, 
      src.cost, 
      src.external_image_url, 
      src.image_url, 
      src.image_path, 
      src.images, 
      target_user_id, 
      true, -- image_is_shared marked as true for clones
      now(), 
      now(), 
      src.id, 
      src.is_active
    ) RETURNING id INTO new_id;

    -- Insert into mapping table
    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);
    
    -- Opcional: Se quisermos clonar também a tabela product_images (nova galeria)
    -- Isso insere as fotos da galeria vinculadas ao novo produto
    -- Descomente abaixo se a tabela product_images já existir e quiser clonar
    /*
    INSERT INTO public.product_images (product_id, url, position, is_primary, sync_status)
    SELECT new_id, url, position, is_primary, 'synced'
    FROM public.product_images
    WHERE product_id = src.id;
    */

  END LOOP;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RETURN QUERY SELECT inserted_rows;
END;
$$ LANGUAGE plpgsql;
