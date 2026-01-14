-- Migration: bulk update prices by brand
-- Creates function bulk_update_prices_by_brand

CREATE OR REPLACE FUNCTION public.bulk_update_prices_by_brand(
  p_user_id UUID,
  p_brand TEXT,
  p_adjustment_type TEXT,
  p_value NUMERIC,
  p_propagate_to_clones BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  IF p_adjustment_type = 'percent' THEN
    UPDATE public.products
    SET
      price = price * (1 + p_value / 100),
      sale_price = CASE WHEN sale_price IS NOT NULL THEN sale_price * (1 + p_value / 100) ELSE NULL END,
      updated_at = now()
    WHERE user_id = p_user_id AND brand = p_brand;
  ELSE
    UPDATE public.products
    SET
      price = price + p_value,
      sale_price = CASE WHEN sale_price IS NOT NULL THEN sale_price + p_value ELSE NULL END,
      updated_at = now()
    WHERE user_id = p_user_id AND brand = p_brand;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF p_propagate_to_clones THEN
    UPDATE public.products p
    SET
      price = m.price,
      sale_price = m.sale_price,
      updated_at = now()
    FROM public.products m
    JOIN public.catalog_clones c ON c.source_product_id = m.id
    WHERE p.id = c.target_product_id
      AND m.user_id = p_user_id
      AND m.brand = p_brand;
  END IF;

  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;
