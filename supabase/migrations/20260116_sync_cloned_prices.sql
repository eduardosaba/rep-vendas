-- Migration: add sync_cloned_prices RPC to propagate price changes from template to clones
-- Date: 2026-01-16

CREATE OR REPLACE FUNCTION public.sync_cloned_prices(
  p_template_product_id uuid,
  p_new_price numeric
)
RETURNS integer AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  -- Atualiza o preço em todos os produtos que possuem este ID como original
  UPDATE public.products
  SET price = p_new_price,
      updated_at = now()
  WHERE original_product_id = p_template_product_id
    AND price IS DISTINCT FROM p_new_price; -- só atualiza se o preço for diferente

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Opcional: função para sincronizar sale_price também
CREATE OR REPLACE FUNCTION public.sync_cloned_sale_prices(
  p_template_product_id uuid,
  p_new_sale_price numeric
)
RETURNS integer AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  UPDATE public.products
  SET sale_price = p_new_sale_price,
      updated_at = now()
  WHERE original_product_id = p_template_product_id
    AND sale_price IS DISTINCT FROM p_new_sale_price;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$ LANGUAGE plpgsql;
