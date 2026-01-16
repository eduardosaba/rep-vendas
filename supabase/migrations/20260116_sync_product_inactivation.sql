-- Migration: add sync_product_inactivation RPC to inactivate clones of a template product
-- Date: 2026-01-16

CREATE OR REPLACE FUNCTION public.sync_product_inactivation(p_template_product_id uuid)
RETURNS integer AS $$
DECLARE
  v_affected integer;
BEGIN
  UPDATE public.products
  SET is_active = false, updated_at = now()
  WHERE original_product_id = p_template_product_id
    AND (is_active IS DISTINCT FROM FALSE);

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$ LANGUAGE plpgsql;
