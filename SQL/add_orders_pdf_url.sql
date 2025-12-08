-- Adiciona coluna pdf_url em orders (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='orders' AND column_name='pdf_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN pdf_url TEXT;
    END IF;
END$$;

-- Opcional: criar índice para buscas por pdf_url
CREATE INDEX IF NOT EXISTS idx_orders_pdf_url ON orders (pdf_url);
