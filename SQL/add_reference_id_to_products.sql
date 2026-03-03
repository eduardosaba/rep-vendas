-- Adiciona coluna reference_id e preenche com referência existente (reference_code) ou slug do nome
BEGIN;

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Backfill: se houver reference_code use ele, senão crie um slug simples a partir do nome
UPDATE products
SET reference_id = COALESCE(reference_id, reference_code, 
  lower(regexp_replace(coalesce(name, ''), '[^a-z0-9]+', '-', 'g')))
WHERE reference_id IS NULL;

-- Index para acelerar buscas por variantes
CREATE INDEX IF NOT EXISTS idx_products_reference_id ON products(reference_id);

COMMIT;
