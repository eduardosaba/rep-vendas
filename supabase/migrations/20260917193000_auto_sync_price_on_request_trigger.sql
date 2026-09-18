-- Migration: 20260917193000_auto_sync_price_on_request_trigger.sql
-- Description: Trigger e função para manter price_on_request em conformidade com a regra de negócio do preço (se price > 0 -> price_on_request = false; se price <= 0 -> price_on_request = true)

CREATE OR REPLACE FUNCTION public.fn_products_auto_sync_price_on_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price IS NOT NULL AND NEW.price > 0 THEN
    NEW.price_on_request := false;
  ELSIF NEW.price IS NULL OR NEW.price <= 0 THEN
    IF NEW.price_on_request IS NULL OR NEW.price_on_request = false THEN
      NEW.price_on_request := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_auto_sync_price_on_request ON public.products;

CREATE TRIGGER trg_products_auto_sync_price_on_request
  BEFORE INSERT OR UPDATE OF price, price_on_request ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_products_auto_sync_price_on_request();

-- Limpeza idempotente no banco de dados existente:
UPDATE public.products
SET price_on_request = false
WHERE price IS NOT NULL AND price > 0 AND price_on_request = true;

UPDATE public.products
SET price_on_request = true
WHERE (price IS NULL OR price <= 0) AND (price_on_request IS NULL OR price_on_request = false);
