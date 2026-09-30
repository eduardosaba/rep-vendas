-- Migration: Sincronização inteligente de referências divergentes entre catálogo master e clones
-- Permite atualizar produtos existentes que já tenham o mesmo reference_code e brand quando houver
-- novos lançamentos (is_launch), novos preços, estoque, fotos ou descrições alteradas.

-- 1. Função para sincronizar produtos divergentes por código de referência e marca
CREATE OR REPLACE FUNCTION public.sync_divergent_products_by_reference(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_brands text[] DEFAULT NULL,
  p_properties text[] DEFAULT NULL
)
RETURNS TABLE (
  updated_products integer,
  affected_users integer
) AS $$
DECLARE
  v_updated integer := 0;
  v_affected integer := 0;
BEGIN
  -- Propriedades permitidas ao clonar para não sobrescrever fotos, slugs ou customizações do cliente:
  -- Atualiza apenas: price, sale_price, is_launch, sku, barcode (ean), is_active (status), description
  IF p_properties IS NULL THEN
    p_properties := ARRAY[
      'price', 'sale_price', 'is_launch', 'sku', 'barcode', 'is_active', 'description'
    ];
  END IF;

  -- 1) Atualiza produtos existentes no target que divergirem de src
  WITH divergent_matches AS (
    SELECT 
      tgt.id AS target_id,
      src.*
    FROM public.products tgt
    JOIN public.products src
      ON src.user_id = p_source_user_id
     AND LOWER(TRIM(src.reference_code)) = LOWER(TRIM(tgt.reference_code))
     AND LOWER(TRIM(src.brand)) = LOWER(TRIM(tgt.brand))
    WHERE tgt.user_id = p_target_user_id
      AND (p_brands IS NULL OR src.brand = ANY(p_brands))
  ),
  updated_rows AS (
    UPDATE public.products p
    SET
      -- Flags e Status
      is_launch = CASE WHEN 'is_launch' = ANY(p_properties) THEN m.is_launch ELSE p.is_launch END,
      is_active = CASE WHEN 'is_active' = ANY(p_properties) THEN m.is_active ELSE p.is_active END,
      is_best_seller = CASE WHEN ('is_best_seller' = ANY(p_properties) OR 'bestseller' = ANY(p_properties)) THEN m.is_best_seller ELSE p.is_best_seller END,
      bestseller = CASE WHEN ('is_best_seller' = ANY(p_properties) OR 'bestseller' = ANY(p_properties)) THEN m.bestseller ELSE p.bestseller END,
      is_destaque = CASE WHEN 'is_destaque' = ANY(p_properties) THEN m.is_destaque ELSE p.is_destaque END,
      price_on_request = CASE WHEN 'price_on_request' = ANY(p_properties) THEN m.price_on_request ELSE p.price_on_request END,

      -- Preços
      price = CASE WHEN 'price' = ANY(p_properties) THEN m.price ELSE p.price END,
      sale_price = CASE WHEN 'sale_price' = ANY(p_properties) THEN m.sale_price ELSE p.sale_price END,
      cost = CASE WHEN ('cost' = ANY(p_properties) OR 'cost_price' = ANY(p_properties)) THEN m.cost ELSE p.cost END,
      original_price = CASE WHEN 'original_price' = ANY(p_properties) THEN m.original_price ELSE p.original_price END,
      discount_percent = CASE WHEN 'discount_percent' = ANY(p_properties) THEN m.discount_percent ELSE p.discount_percent END,

      -- Descrição e Categorização
      name = CASE WHEN 'name' = ANY(p_properties) THEN m.name ELSE p.name END,
      description = CASE WHEN 'description' = ANY(p_properties) THEN m.description ELSE p.description END,
      category = CASE WHEN 'category' = ANY(p_properties) THEN m.category ELSE p.category END,
      category_id = CASE WHEN 'category' = ANY(p_properties) THEN m.category_id ELSE p.category_id END,
      color = CASE WHEN 'color' = ANY(p_properties) THEN m.color ELSE p.color END,
      gender = CASE WHEN 'gender' = ANY(p_properties) THEN m.gender ELSE p.gender END,
      class_core = CASE WHEN 'class_core' = ANY(p_properties) THEN m.class_core ELSE p.class_core END,

      -- Imagens
      image_url = CASE WHEN ('image_url' = ANY(p_properties) OR 'images' = ANY(p_properties)) THEN m.image_url ELSE p.image_url END,
      external_image_url = CASE WHEN ('external_image_url' = ANY(p_properties) OR 'images' = ANY(p_properties)) THEN m.external_image_url ELSE p.external_image_url END,
      image_path = CASE WHEN ('image_path' = ANY(p_properties) OR 'images' = ANY(p_properties)) THEN m.image_path ELSE p.image_path END,
      images = CASE WHEN 'images' = ANY(p_properties) THEN m.images ELSE p.images END,
      gallery_images = CASE WHEN ('gallery_images' = ANY(p_properties) OR 'images' = ANY(p_properties)) THEN m.gallery_images ELSE p.gallery_images END,
      image_variants = CASE WHEN ('image_variants' = ANY(p_properties) OR 'images' = ANY(p_properties)) THEN m.image_variants ELSE p.image_variants END,

      -- Estoque e Técnicos
      stock_quantity = CASE WHEN 'stock_quantity' = ANY(p_properties) THEN m.stock_quantity ELSE p.stock_quantity END,
      track_stock = CASE WHEN 'track_stock' = ANY(p_properties) THEN m.track_stock ELSE p.track_stock END,
      manage_stock = CASE WHEN 'manage_stock' = ANY(p_properties) THEN m.manage_stock ELSE p.manage_stock END,
      min_stock_level = CASE WHEN 'min_stock_level' = ANY(p_properties) THEN m.min_stock_level ELSE p.min_stock_level END,
      barcode = CASE WHEN 'barcode' = ANY(p_properties) THEN m.barcode ELSE p.barcode END,
      sku = CASE WHEN 'sku' = ANY(p_properties) THEN m.sku ELSE p.sku END,
      technical_specs = CASE WHEN 'technical_specs' = ANY(p_properties) THEN m.technical_specs ELSE p.technical_specs END,

      -- Atributos ópticos
      material = CASE WHEN 'material' = ANY(p_properties) THEN m.material ELSE p.material END,
      polarizado = CASE WHEN 'polarizado' = ANY(p_properties) THEN m.polarizado ELSE p.polarizado END,
      fotocromatico = CASE WHEN 'fotocromatico' = ANY(p_properties) THEN m.fotocromatico ELSE p.fotocromatico END,
      material_haste = CASE WHEN 'material_haste' = ANY(p_properties) THEN m.material_haste ELSE p.material_haste END,
      colecao = CASE WHEN 'colecao' = ANY(p_properties) THEN m.colecao ELSE p.colecao END,
      frame_formato = CASE WHEN 'frame_formato' = ANY(p_properties) THEN m.frame_formato ELSE p.frame_formato END,
      color_nome = CASE WHEN 'color_nome' = ANY(p_properties) THEN m.color_nome ELSE p.color_nome END,

      updated_at = now()
    FROM divergent_matches m
    WHERE p.id = m.target_id
      AND (
        (m.is_launch IS DISTINCT FROM p.is_launch)
        OR (m.price IS DISTINCT FROM p.price)
        OR (m.sale_price IS DISTINCT FROM p.sale_price)
        OR (m.cost IS DISTINCT FROM p.cost)
        OR (m.is_active IS DISTINCT FROM p.is_active)
        OR (m.description IS DISTINCT FROM p.description)
        OR (m.stock_quantity IS DISTINCT FROM p.stock_quantity)
        OR (m.image_url IS DISTINCT FROM p.image_url)
        OR (m.images::text IS DISTINCT FROM p.images::text)
        OR (m.gallery_images::text IS DISTINCT FROM p.gallery_images::text)
      )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated_rows;

  -- 2) Preenche mapeamentos ausentes na tabela catalog_clones
  INSERT INTO public.catalog_clones (source_product_id, cloned_product_id, source_user_id, target_user_id, created_at)
  SELECT src.id, tgt.id, p_source_user_id, p_target_user_id, now()
  FROM public.products tgt
  JOIN public.products src
    ON src.user_id = p_source_user_id
   AND LOWER(TRIM(src.reference_code)) = LOWER(TRIM(tgt.reference_code))
   AND LOWER(TRIM(src.brand)) = LOWER(TRIM(tgt.brand))
  WHERE tgt.user_id = p_target_user_id
    AND (p_brands IS NULL OR src.brand = ANY(p_brands))
    AND NOT EXISTS (
      SELECT 1 FROM public.catalog_clones cc
      WHERE cc.cloned_product_id = tgt.id
    );

  v_affected := CASE WHEN v_updated > 0 THEN 1 ELSE 0 END;
  RETURN QUERY SELECT v_updated, v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
