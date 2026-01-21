-- Fix search precision: Prioritize exact Reference/SKU matches and use ILIKE instead of fuzzy search
-- This fixes the issue where searching "1040" returns "10" or "40" (false positive partial matches)

DROP FUNCTION IF EXISTS search_products(text, uuid);

CREATE OR REPLACE FUNCTION search_products(search_term TEXT, catalog_user_id UUID)
RETURNS SETOF products
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized_term TEXT;
BEGIN
  -- Normalize: Remove extra spaces
  normalized_term := trim(search_term);
  
  -- If empty, return nothing (or could return all, but usually search implies filtering)
  IF normalized_term = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM products
  WHERE user_id = catalog_user_id
  AND (
      -- 1. Reference Code (Prioritize StartsWith/Exact)
      reference_code ILIKE normalized_term || '%'
      OR
      -- 2. SKU
      sku ILIKE normalized_term || '%'
      OR
      -- 3. Exact Name Match (rare but possible)
      name ILIKE normalized_term
      OR
      -- 4. Contains in Name (standard search)
      name ILIKE '%' || normalized_term || '%'
      OR
      -- 5. Brand
      brand ILIKE '%' || normalized_term || '%'
      OR
      -- 6. Description (Optional, maybe too noisy? detecting strictly numbers in description is risky)
      description ILIKE '%' || normalized_term || '%'
  )
  ORDER BY
    -- RELEVANCE SCORING (Lower is better)
    CASE 
      -- Exact Reference Match (Top Priority)
      WHEN reference_code ILIKE normalized_term THEN 1
      -- Starts with Reference
      WHEN reference_code ILIKE normalized_term || '%' THEN 2
      -- Exact SKU
      WHEN sku ILIKE normalized_term THEN 3
      -- Starts with SKU
      WHEN sku ILIKE normalized_term || '%' THEN 4
      -- Exact Name
      WHEN name ILIKE normalized_term THEN 5
      -- Contains in Name
      WHEN name ILIKE '%' || normalized_term || '%' THEN 6
      ELSE 7
    END ASC,
    -- Secondary Sort by Name
    name ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
