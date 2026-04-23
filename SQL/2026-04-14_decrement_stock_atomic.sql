-- Cria função atômica para decrementar estoque
-- Uso: SELECT decrement_stock_atomic('product-uuid'::uuid, 2);
-- Use CREATE OR REPLACE FUNCTION diretamente (idempotente)
CREATE OR REPLACE FUNCTION public.decrement_stock_atomic(p_product_id uuid, p_qty integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN TRUE;
  END IF;

  UPDATE public.products
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_product_id
    AND (manage_stock = false OR stock_quantity >= p_qty);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;
