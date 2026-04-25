-- Migration: Ensure clone_catalog_smart copies additional product fields
-- Date: 2026-04-24
-- Adds material, polarizado, fotocromatico, material_haste, colecao to cloned rows

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
  PERFORM pg_advisory_xact_lock(hashtext(target_user_id::text)::bigint);

  -- Resolve company ids for source and target (if any)
  DECLARE
    source_company_id uuid := NULL;
    target_company_id uuid := NULL;
    br_name text;
    src_brand record;
  BEGIN
    SELECT company_id INTO source_company_id FROM public.profiles WHERE id = source_user_id LIMIT 1;
    SELECT company_id INTO target_company_id FROM public.profiles WHERE id = target_user_id LIMIT 1;

    -- Upsert brands metadata for each brand in brands_to_copy (if provided)
    IF brands_to_copy IS NOT NULL THEN
      FOREACH br_name IN ARRAY brands_to_copy LOOP
        -- try find brand owned by source user
        SELECT b.name, b.logo_url, b.banner_url, b.description, b.banner_meta
        INTO src_brand
        FROM public.brands b
        WHERE b.name = br_name
          AND (b.user_id = source_user_id OR (source_company_id IS NOT NULL AND b.company_id = source_company_id))
        LIMIT 1;

        IF FOUND THEN
          -- insert if not exists for target (user or company)
          INSERT INTO public.brands (id, name, logo_url, banner_url, description, banner_meta, user_id, company_id, created_at, updated_at)
          SELECT gen_random_uuid(), src_brand.name, src_brand.logo_url, src_brand.banner_url, src_brand.description, src_brand.banner_meta,
                 target_user_id, target_company_id, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM public.brands tb
            WHERE tb.name = src_brand.name AND (tb.user_id = target_user_id OR (target_company_id IS NOT NULL AND tb.company_id = target_company_id))
          );
        END IF;
      END LOOP;
    END IF;
  END;

  FOR s_row IN
    SELECT p.*, (CASE WHEN COALESCE(p.slug, '') = '' THEN regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g') ELSE p.slug END) AS base_slug
    FROM public.products p
    WHERE p.user_id = source_user_id
      AND (brands_to_copy IS NULL OR p.brand = ANY(brands_to_copy))
      AND NOT EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.reference_code = p.reference_code
          AND p2.brand = p.brand
      )
    ORDER BY p.id
  LOOP
    SELECT COALESCE(MAX((substring(p.slug FROM '-(\d+)$'))::int), 0) INTO max_suffix
    FROM public.products p
    WHERE p.user_id = target_user_id
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
          -- New fields
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
          s_row.id, 'synced', target_user_id,
          -- New values copied through
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
    VALUES (s_row.id, cloned_product_id, source_user_id, target_user_id, now());

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
