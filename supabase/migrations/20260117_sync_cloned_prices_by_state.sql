-- Migration: add sync_cloned_prices_by_state and sync_cloned_sale_prices_by_state
-- Date: 2026-01-17

CREATE OR REPLACE FUNCTION public.sync_cloned_prices_by_state(
  p_template_product_id uuid,
  p_new_price numeric,
  p_state text
)
RETURNS integer AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  UPDATE public.products pr
  SET price = p_new_price,
      updated_at = now()
  FROM public.profiles p
  WHERE pr.user_id = p.id
    AND pr.original_product_id = p_template_product_id
    AND p.state = p_state
    AND pr.price IS DISTINCT FROM p_new_price;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_cloned_sale_prices_by_state(
  p_template_product_id uuid,
  p_new_sale_price numeric,
  p_state text
)
RETURNS integer AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  UPDATE public.products pr
  SET sale_price = p_new_sale_price,
      updated_at = now()
  FROM public.profiles p
  WHERE pr.user_id = p.id
    AND pr.original_product_id = p_template_product_id
    AND p.state = p_state
    AND pr.sale_price IS DISTINCT FROM p_new_sale_price;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$ LANGUAGE plpgsql;
