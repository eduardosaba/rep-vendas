-- Migration: Sync incremental catalog updates to existing clones
-- Date: 2026-02-07
-- Purpose: Allow master user to push new products to all representatives who previously received clones

-- Function 1: Sync updates from source to ALL users who have received clones
-- Usage: SELECT sync_catalog_updates_to_all_clones('master_user_id', ARRAY['Brand1', 'Brand2']);
CREATE OR REPLACE FUNCTION public.sync_catalog_updates_to_all_clones(
  source_user_id uuid,
  brands_to_sync text[] DEFAULT NULL
)
RETURNS TABLE (
  target_user_id uuid,
  target_email text,
  products_added integer
) AS $$
DECLARE
  target_record record;
  copied_count integer;
BEGIN
  -- Find all unique target users who have received clones from this source
  FOR target_record IN
    SELECT DISTINCT 
      cc.target_user_id,
      COALESCE(p.email, 'N/A') AS email
    FROM catalog_clones cc
    LEFT JOIN profiles p ON p.id = cc.target_user_id
    WHERE cc.source_user_id = sync_catalog_updates_to_all_clones.source_user_id
  LOOP
    -- Call clone_catalog_smart for each target (idempotent - only new products will be added)
    SELECT * INTO copied_count 
    FROM clone_catalog_smart(
      sync_catalog_updates_to_all_clones.source_user_id,
      target_record.target_user_id,
      brands_to_sync
    );

    -- Return row with user info and count
    RETURN QUERY SELECT 
      target_record.target_user_id,
      target_record.email,
      copied_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Sync updates only to users who work with specific brands
-- Usage: SELECT sync_catalog_updates_by_brand('master_user_id', ARRAY['Nike', 'Adidas']);
CREATE OR REPLACE FUNCTION public.sync_catalog_updates_by_brand(
  source_user_id uuid,
  target_brands text[]
)
RETURNS TABLE (
  target_user_id uuid,
  target_email text,
  products_added integer,
  brands_synced text[]
) AS $$
DECLARE
  target_record record;
  copied_count integer;
BEGIN
  -- Find users who have cloned products from these specific brands
  FOR target_record IN
    SELECT DISTINCT 
      cc.target_user_id,
      COALESCE(p.email, 'N/A') AS email
    FROM catalog_clones cc
    JOIN products prod ON prod.id = cc.cloned_product_id
    LEFT JOIN profiles p ON p.id = cc.target_user_id
    WHERE cc.source_user_id = sync_catalog_updates_by_brand.source_user_id
      AND prod.brand = ANY(target_brands)
  LOOP
    -- Clone only the specified brands
    SELECT * INTO copied_count 
    FROM clone_catalog_smart(
      sync_catalog_updates_by_brand.source_user_id,
      target_record.target_user_id,
      target_brands
    );

    RETURN QUERY SELECT 
      target_record.target_user_id,
      target_record.email,
      copied_count,
      target_brands;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get summary of clones from a source (useful for dashboard)
CREATE OR REPLACE FUNCTION public.get_clone_summary(
  source_user_id uuid
)
RETURNS TABLE (
  target_user_id uuid,
  target_email text,
  total_cloned_products integer,
  brands text[],
  last_clone_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.target_user_id,
    COALESCE(p.email, 'N/A') AS email,
    COUNT(DISTINCT cc.cloned_product_id)::integer AS total_cloned_products,
    array_agg(DISTINCT prod.brand ORDER BY prod.brand) FILTER (WHERE prod.brand IS NOT NULL) AS brands,
    MAX(cc.created_at) AS last_clone_date
  FROM catalog_clones cc
  LEFT JOIN profiles p ON p.id = cc.target_user_id
  LEFT JOIN products prod ON prod.id = cc.cloned_product_id
  WHERE cc.source_user_id = get_clone_summary.source_user_id
  GROUP BY cc.target_user_id, p.email
  ORDER BY MAX(cc.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions (adjust as needed for your RLS setup)
-- GRANT EXECUTE ON FUNCTION public.sync_catalog_updates_to_all_clones TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.sync_catalog_updates_by_brand TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_clone_summary TO authenticated;
