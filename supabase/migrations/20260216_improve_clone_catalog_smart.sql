-- Migration: Improve clone_catalog_smart to copy missing fields and generate slug
-- Date: 2026-02-16
-- Replaces previous clone function with extended field copying (category_id, sku, slug, image_variants, gallery_images)

DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid, text[]);

CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id uuid,
  target_user_id uuid,
  brands_to_copy text[]
)
RETURNS TABLE (copied_count integer) AS $$
DECLARE
  src record;
  new_id uuid;
  final_image_url text;
  final_external_image_url text;
  generated_slug text;
BEGIN
  FOR src IN
    SELECT * FROM public.products p
    WHERE p.user_id = source_user_id
      AND (brands_to_copy IS NULL OR p.brand = ANY(brands_to_copy))
      AND (p.is_active IS DISTINCT FROM FALSE)
  LOOP
    -- Skip duplicates on reference or name/brand
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

    -- Slug: prefer existing slug, otherwise generate from name + short hash
    generated_slug := COALESCE(src.slug, regexp_replace(lower(coalesce(src.name,'')),'[^a-z0-9]+','-','g') || '-' || substr(md5(random()::text),1,6));

    -- Choose final image fields: if internal image_path or images exist, do not copy external urls
    IF src.image_path IS NOT NULL OR (src.images IS NOT NULL AND jsonb_typeof(src.images) = 'array' AND jsonb_array_length(src.images) > 0) THEN
      final_image_url := NULL;
      final_external_image_url := NULL;
    ELSE
      final_image_url := src.image_url;
      final_external_image_url := src.external_image_url;
    END IF;

    INSERT INTO public.products (
      name, reference_code, brand, category, category_id, sku, description,
      price, sale_price, cost, external_image_url, image_url,
      image_path, images, image_variants, gallery_images, slug, user_id, image_is_shared, created_at, updated_at
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.category_id, src.sku, src.description,
      src.price, src.sale_price, src.cost,
      final_external_image_url,
      final_image_url,
      src.image_path,
      src.images,
      src.image_variants,
      src.gallery_images,
      generated_slug,
      target_user_id,
      true,
      now(),
      now()
    ) RETURNING id INTO new_id;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id)
    VALUES (src.id, new_id, source_user_id, target_user_id);
  END LOOP;

  RETURN QUERY
    SELECT COUNT(*)::integer AS copied_count
    FROM public.catalog_clones cc
    WHERE cc.source_user_id = source_user_id
      AND cc.target_user_id = target_user_id
      AND cc.created_at >= now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
