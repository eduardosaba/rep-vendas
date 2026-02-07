-- Migration: Clone Management - Undo and Property Sync
-- Date: 2026-02-07
-- Purpose: Allow undoing clones and syncing property changes from master to clones

-- 1. Function to UNDO clone (safe delete of cloned products)
CREATE OR REPLACE FUNCTION public.undo_catalog_clone(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_brands text[] DEFAULT NULL -- NULL = todas as marcas
)
RETURNS TABLE (deleted_count integer) AS $$
DECLARE
  deleted_rows integer := 0;
BEGIN
  -- Delete cloned products that match criteria
  WITH products_to_delete AS (
    SELECT cc.cloned_product_id
    FROM public.catalog_clones cc
    JOIN public.products src ON src.id = cc.source_product_id
    WHERE cc.source_user_id = p_source_user_id
      AND cc.target_user_id = p_target_user_id
      AND (p_brands IS NULL OR src.brand = ANY(p_brands))
  )
  DELETE FROM public.products
  WHERE id IN (SELECT cloned_product_id FROM products_to_delete)
    AND user_id = p_target_user_id
    AND image_is_shared = true; -- safety: only delete cloned products
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;

  -- Cleanup orphaned catalog_clones entries
  DELETE FROM public.catalog_clones
  WHERE source_user_id = p_source_user_id
    AND target_user_id = p_target_user_id
    AND cloned_product_id NOT IN (SELECT id FROM public.products);

  RETURN QUERY SELECT deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to sync property changes from master to clones
CREATE OR REPLACE FUNCTION public.sync_product_properties_to_clones(
  p_source_user_id uuid,
  p_target_user_id uuid DEFAULT NULL, -- NULL = todos os clones
  p_brands text[] DEFAULT NULL,       -- NULL = todas as marcas
  p_properties text[] DEFAULT NULL    -- NULL = todas as propriedades
)
RETURNS TABLE (
  updated_products integer,
  affected_users integer
) AS $$
DECLARE
  updated_rows integer := 0;
  affected_user_count integer := 0;
BEGIN
  -- Default properties to sync if not specified
  IF p_properties IS NULL THEN
    p_properties := ARRAY[
      'price', 'sale_price', 'cost',
      'is_active', 'is_launch', 'is_best_seller', 'bestseller',
      'description', 'category', 'color',
      'barcode', 'technical_specs',
      'stock_quantity', 'track_stock'
    ];
  END IF;

  -- Build dynamic UPDATE based on properties array
  -- For safety and performance, we'll update specific known fields
  WITH clones_to_update AS (
    SELECT 
      cc.cloned_product_id,
      cc.target_user_id,
      src.*
    FROM public.catalog_clones cc
    JOIN public.products src ON src.id = cc.source_product_id
    WHERE cc.source_user_id = p_source_user_id
      AND (p_target_user_id IS NULL OR cc.target_user_id = p_target_user_id)
      AND (p_brands IS NULL OR src.brand = ANY(p_brands))
  )
  UPDATE public.products tgt
  SET
    -- Pricing (always sync if in properties list)
    price = CASE WHEN 'price' = ANY(p_properties) THEN src.price ELSE tgt.price END,
    sale_price = CASE WHEN 'sale_price' = ANY(p_properties) THEN src.sale_price ELSE tgt.sale_price END,
    cost = CASE WHEN 'cost' = ANY(p_properties) THEN src.cost ELSE tgt.cost END,
    
    -- Status flags
    is_active = CASE WHEN 'is_active' = ANY(p_properties) THEN src.is_active ELSE tgt.is_active END,
    is_launch = CASE WHEN 'is_launch' = ANY(p_properties) THEN src.is_launch ELSE tgt.is_launch END,
    is_best_seller = CASE WHEN 'is_best_seller' = ANY(p_properties) THEN src.is_best_seller ELSE tgt.is_best_seller END,
    bestseller = CASE WHEN 'bestseller' = ANY(p_properties) THEN src.bestseller ELSE tgt.bestseller END,
    
    -- Metadata
    description = CASE WHEN 'description' = ANY(p_properties) THEN src.description ELSE tgt.description END,
    category = CASE WHEN 'category' = ANY(p_properties) THEN src.category ELSE tgt.category END,
    color = CASE WHEN 'color' = ANY(p_properties) THEN src.color ELSE tgt.color END,
    barcode = CASE WHEN 'barcode' = ANY(p_properties) THEN src.barcode ELSE tgt.barcode END,
    technical_specs = CASE WHEN 'technical_specs' = ANY(p_properties) THEN src.technical_specs ELSE tgt.technical_specs END,
    
    -- Stock
    stock_quantity = CASE WHEN 'stock_quantity' = ANY(p_properties) THEN src.stock_quantity ELSE tgt.stock_quantity END,
    track_stock = CASE WHEN 'track_stock' = ANY(p_properties) THEN src.track_stock ELSE tgt.track_stock END,
    
    updated_at = now()
  FROM clones_to_update src
  WHERE tgt.id = src.cloned_product_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  -- Count affected users
  SELECT COUNT(DISTINCT target_user_id) INTO affected_user_count
  FROM clones_to_update;

  RETURN QUERY SELECT updated_rows, affected_user_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get clone history with details
CREATE OR REPLACE FUNCTION public.get_clone_history(
  p_target_user_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  clone_id uuid,
  source_product_id uuid,
  cloned_product_id uuid,
  product_name text,
  brand text,
  reference_code text,
  cloned_at timestamptz,
  source_user_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id as clone_id,
    cc.source_product_id,
    cc.cloned_product_id,
    p.name as product_name,
    p.brand,
    p.reference_code,
    cc.created_at as cloned_at,
    u.email as source_user_email
  FROM public.catalog_clones cc
  JOIN public.products p ON p.id = cc.cloned_product_id
  LEFT JOIN auth.users u ON u.id = cc.source_user_id
  WHERE cc.target_user_id = p_target_user_id
  ORDER BY cc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get clone statistics
CREATE OR REPLACE FUNCTION public.get_clone_stats(
  p_target_user_id uuid
)
RETURNS TABLE (
  total_clones bigint,
  total_brands bigint,
  latest_clone timestamptz,
  brands_summary jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT cc.cloned_product_id) as total_clones,
    COUNT(DISTINCT p.brand) as total_brands,
    MAX(cc.created_at) as latest_clone,
    jsonb_object_agg(
      COALESCE(p.brand, 'Sem marca'),
      COUNT(cc.id)
    ) as brands_summary
  FROM public.catalog_clones cc
  JOIN public.products p ON p.id = cc.cloned_product_id
  WHERE cc.target_user_id = p_target_user_id
  GROUP BY cc.target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage (commented):
/*
-- Undo clone for specific user and brands
SELECT * FROM undo_catalog_clone(
  'source_user_id_here'::uuid,
  'target_user_id_here'::uuid,
  ARRAY['Boss', 'Tommy Hilfiger']
);

-- Sync only prices and status to all clones
SELECT * FROM sync_product_properties_to_clones(
  'source_user_id_here'::uuid,
  NULL, -- all targets
  NULL, -- all brands
  ARRAY['price', 'sale_price', 'is_active']
);

-- Get clone history
SELECT * FROM get_clone_history('target_user_id_here'::uuid, 50);

-- Get clone stats
SELECT * FROM get_clone_stats('target_user_id_here'::uuid);
*/
