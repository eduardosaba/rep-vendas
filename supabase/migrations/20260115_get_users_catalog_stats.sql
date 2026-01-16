-- Migration: create get_users_catalog_stats function
-- Date: 2026-01-15

CREATE OR REPLACE FUNCTION public.get_users_catalog_stats()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  user_category text,
  can_be_clone_source boolean,
  total_products bigint,
  brands_list text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::uuid as user_id,
    p.full_name,
    p.email,
    p.user_category,
    p.can_be_clone_source,
    COUNT(pr.id) as total_products,
    STRING_AGG(DISTINCT pr.brand, ', ') as brands_list
  FROM public.profiles p
  LEFT JOIN public.products pr ON pr.user_id = p.id
  GROUP BY p.id, p.full_name, p.email, p.user_category, p.can_be_clone_source;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated role (optional)
GRANT EXECUTE ON FUNCTION public.get_users_catalog_stats() TO authenticated;
