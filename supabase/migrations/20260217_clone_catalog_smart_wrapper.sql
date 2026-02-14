-- Wrapper for old overload signature of clone_catalog_smart
-- Delegates to canonical function (source_user_id, target_user_id, brands_to_copy)

CREATE OR REPLACE FUNCTION public.clone_catalog_smart(
  p_brands_to_copy TEXT[],
  p_source_user_id UUID,
  p_target_user_id UUID
)
RETURNS TABLE (products_added INT) AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM public.clone_catalog_smart(
      source_user_id := p_source_user_id,
      target_user_id := p_target_user_id,
      brands_to_copy := p_brands_to_copy
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: run this migration in Supabase SQL editor as a master user.
