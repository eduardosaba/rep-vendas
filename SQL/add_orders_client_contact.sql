-- Adiciona colunas client_email_guest e client_cnpj_guest na tabela orders (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='client_email_guest'
    ) THEN
        ALTER TABLE orders ADD COLUMN client_email_guest TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='client_cnpj_guest'
    ) THEN
        ALTER TABLE orders ADD COLUMN client_cnpj_guest TEXT;
    END IF;
END$$;

-- Índices opcionais para busca
CREATE INDEX IF NOT EXISTS idx_orders_client_email_guest ON orders (client_email_guest);
CREATE INDEX IF NOT EXISTS idx_orders_client_cnpj_guest ON orders (client_cnpj_guest);
