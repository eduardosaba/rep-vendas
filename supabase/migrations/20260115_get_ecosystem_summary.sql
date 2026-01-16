-- Migration: create get_ecosystem_summary function
-- Date: 2026-01-15

CREATE OR REPLACE FUNCTION public.get_ecosystem_summary()
RETURNS TABLE (
  total_products BIGINT,
  total_brands BIGINT,
  total_users BIGINT,
  shared_images_count BIGINT,
  storage_savings_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_products,
    COUNT(DISTINCT brand)::BIGINT as total_brands,
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE image_is_shared = true)::BIGINT as shared_images_count,
    ROUND(
      (COUNT(*) FILTER (WHERE image_is_shared = true)::NUMERIC /
       NULLIF(COUNT(*), 0)::NUMERIC) * 100, 2
    ) as storage_savings_percent
  FROM public.products;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated role (optional)
GRANT EXECUTE ON FUNCTION public.get_ecosystem_summary() TO authenticated;
