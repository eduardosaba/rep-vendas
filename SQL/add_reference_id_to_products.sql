-- Adiciona coluna reference_id e preenche com referência existente (reference_code) preservando o formato original
BEGIN;

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Backfill: usa derive_base_reference para derivar o modelo base preservando espaços e maiúsculas
UPDATE products
SET reference_id = public.derive_base_reference(reference_code)
WHERE reference_id IS NULL OR reference_id = '';

-- Index para acelerar buscas por variantes
CREATE INDEX IF NOT EXISTS idx_products_reference_id ON products(reference_id);

COMMIT;
