-- Migration: Corrigir conflitos de tipo de retorno nas funções RPC clone_catalog_smart e clone_catalog_batch
-- Remove wrappers antigos que causavam o erro: "structure of query does not match function result type"

-- 1. Dropar todas as sobrecargas antigas conflitantes de clone_catalog_smart
DROP FUNCTION IF EXISTS public.clone_catalog_smart(text[], uuid, uuid);
DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid, text[]);
DROP FUNCTION IF EXISTS public.clone_catalog_smart(uuid, uuid);

-- 2. Recriar clone_catalog_smart canonical com retorno seguro e uniforme
CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id uuid,
  target_user_id uuid,
  brands_to_copy text[] DEFAULT NULL
)
RETURNS TABLE (products_added integer)
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
BEGIN
  -- Identifica organização e empresa do destino
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
  LOOP
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
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_new_id := gen_random_uuid();
        v_candidate_slug := v_slug_base || '-' || right(replace(v_new_id::text, '-', ''), 4);
      END;
    END LOOP;

    INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
    VALUES (s_row.id, cloned_product_id, source_user_id, target_user_id, now());

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;
