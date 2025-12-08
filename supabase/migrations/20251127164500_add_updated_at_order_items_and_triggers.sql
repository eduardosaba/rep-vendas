-- Migração idempotente: garante coluna updated_at em order_items
-- e cria triggers de atualização para orders e order_items

-- 1) Garante coluna updated_at em order_items
ALTER TABLE IF EXISTS public.order_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Garante a função update_updated_at_column (safe: CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3) Cria triggers somente se ainda não existirem (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_order_items_updated_at' AND c.relname = 'order_items'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_order_items_updated_at
      BEFORE UPDATE ON public.order_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_orders_updated_at' AND c.relname = 'orders'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;
END;
$$;

-- Nota: esta migração é segura para executar múltiplas vezes.
