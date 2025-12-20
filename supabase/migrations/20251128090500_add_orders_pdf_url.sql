-- Migration: adiciona coluna pdf_url em orders (idempotente)
-- Gerado para produção em 2025-11-28

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='pdf_url'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN pdf_url TEXT;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_orders_pdf_url ON public.orders (pdf_url);
