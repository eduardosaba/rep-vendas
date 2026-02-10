-- FIX: Recria clone_catalog_smart com nomes de parâmetros compatíveis com a API Node.js
-- Data: 2026-02-10
-- Problema: Cache do Supabase não encontrava a função com os parâmetros enviados pela rota
-- Solução: CREATE OR REPLACE força refresh do cache + nomes exatos de parâmetros

CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  source_user_id UUID,
  target_user_id UUID,
  brands_to_copy TEXT[]
)
RETURNS TABLE (copied_count INTEGER) AS $$
DECLARE
  src RECORD;
  new_id UUID;
  total_inserted INTEGER := 0;
BEGIN
  -- Loop por cada produto ativo do usuário fonte que pertence às marcas especificadas
  FOR src IN
    SELECT * FROM public.products p
    WHERE p.user_id = source_user_id
      AND (brands_to_copy IS NULL OR p.brand = ANY(brands_to_copy))
      AND (p.is_active IS DISTINCT FROM FALSE) -- Considera NULL como ativo
  LOOP
    -- Skip se o produto já existe no catálogo destino (idempotência por reference_code)
    IF src.reference_code IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.reference_code = src.reference_code
      ) THEN
        CONTINUE;
      END IF;
    ELSE
      -- Fallback: se reference_code for null, evita duplicar por nome+marca
      IF EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.user_id = target_user_id
          AND p2.name = src.name
          AND p2.brand = src.brand
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Insere o produto clonado com image_is_shared=true (copy-on-write)
    INSERT INTO public.products (
      name, reference_code, brand, category, description,
      price, sale_price, cost, external_image_url, image_url,
      image_path, images, user_id, image_is_shared, 
      created_at, updated_at, original_product_id,
      -- Flags importantes
      is_active, is_launch, is_best_seller, bestseller,
      -- Metadados de sincronização (evita reprocessar imagens já otimizadas)
      sync_status, sync_error, original_size_kb, optimized_size_kb, image_optimized,
      -- Outros campos relevantes
      class_core, barcode, technical_specs, color, stock_quantity
    ) VALUES (
      src.name, src.reference_code, src.brand, src.category, src.description,
      src.price, src.sale_price, src.cost, src.external_image_url, src.image_url,
      src.image_path, src.images, target_user_id, TRUE,
      NOW(), NOW(), src.id, -- original_product_id rastreia a origem
      COALESCE(src.is_active, TRUE), COALESCE(src.is_launch, FALSE), 
      COALESCE(src.is_best_seller, FALSE), COALESCE(src.bestseller, FALSE),
      COALESCE(src.sync_status, 'synced'), src.sync_error, 
      src.original_size_kb, src.optimized_size_kb, COALESCE(src.image_optimized, FALSE),
      src.class_core, src.barcode, src.technical_specs, src.color, src.stock_quantity
    ) RETURNING id INTO new_id;

    -- Registra o mapeamento individual (essencial para histórico e undo)
    INSERT INTO public.catalog_clones (
      source_product_id, cloned_product_id, 
      source_user_id, target_user_id, 
      created_at
    ) VALUES (
      src.id, new_id, 
      source_user_id, target_user_id, 
      NOW()
    );

    -- Clona imagens da galeria (product_images) mantendo metadados de otimização
    INSERT INTO public.product_images (
      product_id, url, is_primary, position, 
      sync_status, sync_error, optimized_url, 
      created_at, updated_at
    )
    SELECT
      new_id, pi.url, pi.is_primary, pi.position,
      COALESCE(pi.sync_status, 'synced'), pi.sync_error, pi.optimized_url,
      NOW(), NOW()
    FROM public.product_images pi
    WHERE pi.product_id = src.id
      AND NOT EXISTS (
        SELECT 1 FROM public.product_images tpi 
        WHERE tpi.product_id = new_id AND tpi.url = pi.url
      );

    total_inserted := total_inserted + 1;
  END LOOP;

  -- Retorna total de produtos clonados nesta execução
  RETURN QUERY SELECT total_inserted;
END;
$$ LANGUAGE plpgsql;

-- Concede permissão de execução (ajuste conforme seu setup de roles)
GRANT EXECUTE ON FUNCTION public.clone_catalog_smart(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_catalog_smart(UUID, UUID, TEXT[]) TO service_role;

-- Teste rápido (substitua UUIDs reais para validar):
-- SELECT * FROM public.clone_catalog_smart(
--   'SOURCE_USER_UUID'::UUID, 
--   'TARGET_USER_UUID'::UUID, 
--   ARRAY['Marca1', 'Marca2']::TEXT[]
-- );
