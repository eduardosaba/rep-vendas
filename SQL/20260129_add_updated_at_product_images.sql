-- Migration: 2026-01-29
-- Adiciona coluna `updated_at` em `product_images` caso não exista e popula timestamps

BEGIN;

-- 1) Cria a coluna `updated_at` se ausente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_images' AND column_name = 'updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE product_images ADD COLUMN updated_at timestamptz';
  END IF;
END
$$;

-- 2) Popula `updated_at` para linhas com URL externa que ainda não tenham timestamp
UPDATE product_images
SET updated_at = NOW()
WHERE (updated_at IS NULL OR updated_at = '')
  AND url IS NOT NULL
  AND url LIKE 'http%'
  AND url NOT ILIKE '%/storage/v1/object%';

COMMIT;

-- Nota: execute em staging/backup antes de rodar em produção.
