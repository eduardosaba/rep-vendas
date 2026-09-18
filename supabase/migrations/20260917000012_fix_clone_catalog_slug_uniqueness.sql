-- Migration: Fix clone_catalog_batch and clone_catalog_smart to generate UUID-4 slugs, check global uniqueness, and preserve catalog flags
-- Created at: 2026-09-17

-- 1. Update clone_catalog_batch
DROP FUNCTION IF EXISTS public.clone_catalog_batch(uuid, uuid, text[], integer, uuid);

CREATE OR REPLACE FUNCTION public.clone_catalog_batch(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_brands_to_copy text[] DEFAULT NULL,
  p_batch_size integer DEFAULT 100,
  p_last_id uuid DEFAULT NULL
)
RETURNS TABLE(processed_count integer, last_processed_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt integer := 0;
  last_processed_id uuid := NULL;
  s_row RECORD;
  v_new_id uuid;
  v_slug_base text;
  v_candidate_slug text;
  cloned_product_id uuid;
  target_org_id uuid := NULL;
  target_comp_id uuid := NULL;
BEGIN
  -- Get target profile organization_id and company_id
  SELECT organization_id, company_id INTO target_org_id, target_comp_id
  FROM public.profiles
  WHERE id = p_target_user_id;

  -- Fallback to organizations table if target_org_id is null
  IF target_org_id IS NULL THEN
    SELECT id INTO target_org_id
    FROM public.organizations
    WHERE owner_user_id = p_target_user_id AND is_active = true
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Fallback to user_organizations if still null
  IF target_org_id IS NULL THEN
    SELECT organization_id INTO target_org_id
    FROM public.user_organizations
    WHERE user_id = p_target_user_id AND status = 'active'
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  FOR s_row IN
    SELECT p.*
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
    -- Derive clean slug base from reference_code -> fallback name -> fallback id
    v_slug_base := trim(both '-' from regexp_replace(
        lower(
            coalesce(
                nullif(trim(s_row.reference_code), ''),
                nullif(trim(s_row.name), ''),
                s_row.id::text
            )
        ),
        '[^a-z0-9]+',
        '-',
        'g'
    ));

    -- Generate new UUID and candidate slug until globally unique in public.products
    LOOP
      v_new_id := gen_random_uuid();
      v_candidate_slug := v_slug_base || '-' || right(replace(v_new_id::text, '-', ''), 4);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.products WHERE slug = v_candidate_slug
      );
    END LOOP;

    LOOP
      BEGIN
        INSERT INTO public.products (
          id,
          reference_code, reference_id, name, description, brand, category, category_id,
          slug,
          price, original_price, sale_price, cost, discount_percent,
          image_url, external_image_url, image_path, images, gallery_images,
          image_variants, image_optimized, image_is_shared,
          is_active, is_launch, is_best_seller, bestseller, is_destaque, price_on_request,
          technical_specs, stock_quantity, track_stock, manage_stock,
          min_stock_level, sku, barcode, color, gender, class_core, short_id,
          original_product_id, sync_status, user_id, organization_id, company_id, source_organization_id,
          material, polarizado, fotocromatico, material_haste, colecao, frame_formato, color_nome
        )
        VALUES (
          v_new_id,
          s_row.reference_code, s_row.reference_id, s_row.name, s_row.description, s_row.brand, s_row.category, s_row.category_id,
          v_candidate_slug,
          s_row.price, s_row.original_price, s_row.sale_price, s_row.cost, s_row.discount_percent,
          s_row.image_url, s_row.external_image_url, s_row.image_path, s_row.images, s_row.gallery_images,
          s_row.image_variants, s_row.image_optimized, TRUE,
          COALESCE(s_row.is_active, TRUE), COALESCE(s_row.is_launch, FALSE), COALESCE(s_row.is_best_seller, FALSE), COALESCE(s_row.bestseller, FALSE), COALESCE(s_row.is_destaque, FALSE), COALESCE(s_row.price_on_request, FALSE),
          s_row.technical_specs, s_row.stock_quantity, s_row.track_stock, s_row.manage_stock,
          s_row.min_stock_level, s_row.sku, s_row.barcode, s_row.color, s_row.gender, s_row.class_core, s_row.short_id,
          s_row.id, 'synced', p_target_user_id, target_org_id, target_comp_id, s_row.organization_id,
          s_row.material, s_row.polarizado, s_row.fotocromatico, s_row.material_haste, s_row.colecao, s_row.frame_formato, s_row.color_nome
        )
        RETURNING id INTO cloned_product_id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        v_new_id := gen_random_uuid();
        v_candidate_slug := v_slug_base || '-' || right(replace(v_new_id::text, '-', ''), 4);
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
$$;


-- 2. Update clone_catalog_smart
DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid, text[]);
DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid);
CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id uuid,
  target_user_id uuid,
  brands_to_copy text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  s_row RECORD;
  v_new_id uuid;
  v_slug_base text;
  v_candidate_slug text;
  cloned_product_id uuid;
  target_org_id uuid := NULL;
  target_comp_id uuid := NULL;
  src_settings RECORD;
BEGIN
  -- Get target profile organization_id and company_id
  SELECT organization_id, company_id INTO target_org_id, target_comp_id
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_org_id IS NULL THEN
    SELECT id INTO target_org_id
    FROM public.organizations
    WHERE owner_user_id = target_user_id AND is_active = true
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF target_org_id IS NULL THEN
    SELECT organization_id INTO target_org_id
    FROM public.user_organizations
    WHERE user_id = target_user_id AND status = 'active'
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Copy logo_url from source user settings if target user has no logo_url
  BEGIN
    SELECT logo_url INTO src_settings FROM public.settings WHERE user_id = source_user_id;
    IF src_settings.logo_url IS NOT NULL AND src_settings.logo_url <> '' THEN
      UPDATE public.settings SET logo_url = src_settings.logo_url, updated_at = now()
      WHERE user_id = target_user_id AND (logo_url IS NULL OR logo_url = '');
      IF NOT FOUND THEN
        INSERT INTO public.settings (id, user_id, logo_url, created_at, updated_at)
        VALUES (gen_random_uuid(), target_user_id, src_settings.logo_url, now(), now());
      END IF;
    END IF;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    NULL;
  END;

  FOR s_row IN
    SELECT p.*
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
    -- Derive clean slug base from reference_code -> fallback name -> fallback id
    v_slug_base := trim(both '-' from regexp_replace(
        lower(
            coalesce(
                nullif(trim(s_row.reference_code), ''),
                nullif(trim(s_row.name), ''),
                s_row.id::text
            )
        ),
        '[^a-z0-9]+',
        '-',
        'g'
    ));

    -- Generate new UUID and candidate slug until globally unique in public.products
    LOOP
      v_new_id := gen_random_uuid();
      v_candidate_slug := v_slug_base || '-' || right(replace(v_new_id::text, '-', ''), 4);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.products WHERE slug = v_candidate_slug
      );
    END LOOP;

    LOOP
      BEGIN
        INSERT INTO public.products (
          id,
          reference_code, reference_id, name, description, brand, category, category_id,
          slug,
          price, original_price, sale_price, cost, discount_percent,
          image_url, external_image_url, image_path, images, gallery_images,
          image_variants, image_optimized, image_is_shared,
          is_active, is_launch, is_best_seller, bestseller, is_destaque, price_on_request,
          technical_specs, stock_quantity, track_stock, manage_stock,
          min_stock_level, sku, barcode, color, gender, class_core, short_id,
          original_product_id, sync_status, user_id, organization_id, company_id, source_organization_id,
          material, polarizado, fotocromatico, material_haste, colecao, frame_formato, color_nome
        )
        VALUES (
          v_new_id,
          s_row.reference_code, s_row.reference_id, s_row.name, s_row.description, s_row.brand, s_row.category, s_row.category_id,
          v_candidate_slug,
          s_row.price, s_row.original_price, s_row.sale_price, s_row.cost, s_row.discount_percent,
          s_row.image_url, s_row.external_image_url, s_row.image_path, s_row.images, s_row.gallery_images,
          s_row.image_variants, s_row.image_optimized, TRUE,
          COALESCE(s_row.is_active, TRUE), COALESCE(s_row.is_launch, FALSE), COALESCE(s_row.is_best_seller, FALSE), COALESCE(s_row.bestseller, FALSE), COALESCE(s_row.is_destaque, FALSE), COALESCE(s_row.price_on_request, FALSE),
          s_row.technical_specs, s_row.stock_quantity, s_row.track_stock, s_row.manage_stock,
          s_row.min_stock_level, s_row.sku, s_row.barcode, s_row.color, s_row.gender, s_row.class_core, s_row.short_id,
          s_row.id, 'synced', target_user_id, target_org_id, target_comp_id, s_row.organization_id,
          s_row.material, s_row.polarizado, s_row.fotocromatico, s_row.material_haste, s_row.colecao, s_row.frame_formato, s_row.color_nome
        )
        RETURNING id INTO cloned_product_id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        v_new_id := gen_random_uuid();
        v_candidate_slug := v_slug_base || '-' || right(replace(v_new_id::text, '-', ''), 4);
      END;
    END LOOP;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
    VALUES (s_row.id, cloned_product_id, source_user_id, target_user_id, now());

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object(
    'status', 'success',
    'cloned_count', v_count,
    'source_user_id', source_user_id,
    'target_user_id', target_user_id
  );
END;
$$;
