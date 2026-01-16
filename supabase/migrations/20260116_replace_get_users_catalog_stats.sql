-- Migration: drop and recreate get_users_catalog_stats
-- Date: 2026-01-16

BEGIN;

-- DROP the existing function so we can change its return signature safely
DROP FUNCTION IF EXISTS public.get_users_catalog_stats();

-- Recreate with desired signature (returns role, coalesced brands_list)
CREATE OR REPLACE FUNCTION public.get_users_catalog_stats()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
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
    p.role::text as role,
    p.can_be_clone_source,
    COUNT(pr.id) as total_products,
    COALESCE(STRING_AGG(DISTINCT pr.brand, ', '), '') as brands_list
  FROM public.profiles p
  LEFT JOIN public.products pr ON pr.user_id = p.id
  GROUP BY p.id, p.full_name, p.email, p.role, p.can_be_clone_source;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_users_catalog_stats() TO authenticated;

COMMIT;

-- Rollback (manual):
-- DROP FUNCTION IF EXISTS public.get_users_catalog_stats();
