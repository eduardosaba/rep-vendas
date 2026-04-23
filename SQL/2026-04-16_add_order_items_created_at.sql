-- Adiciona created_at em order_items quando ausente e garante valor para registros legados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
  ) THEN
    ALTER TABLE public.order_items
      ADD COLUMN IF NOT EXISTS created_at timestamptz;

    -- Backfill: usa created_at do pedido quando possível, senão now()
    UPDATE public.order_items oi
    SET created_at = COALESCE(o.created_at, now())
    FROM public.orders o
    WHERE oi.order_id = o.id
      AND oi.created_at IS NULL;

    UPDATE public.order_items
    SET created_at = now()
    WHERE created_at IS NULL;

    ALTER TABLE public.order_items
      ALTER COLUMN created_at SET DEFAULT now();
  END IF;
END $$;
