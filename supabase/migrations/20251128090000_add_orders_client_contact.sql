-- Migration: adiciona client_email_guest e client_cnpj_guest em orders (idempotente)
-- Gerado para produção em 2025-11-28

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='client_email_guest'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN client_email_guest TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='client_cnpj_guest'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN client_cnpj_guest TEXT;
    END IF;
END$$;

-- índices opcionais
CREATE INDEX IF NOT EXISTS idx_orders_client_email_guest ON public.orders (client_email_guest);
CREATE INDEX IF NOT EXISTS idx_orders_client_cnpj_guest ON public.orders (client_cnpj_guest);
