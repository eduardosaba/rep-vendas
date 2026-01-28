-- 2026-01-26: Add unique constraints and cascade FK for product images
-- Garante que o mesmo representante não cadastre a mesma referência duas vezes
-- Cria constraints somente se ainda não existirem (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_reference'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT unique_user_reference UNIQUE (user_id, reference_code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_slug'
  ) THEN
    -- Ajuste: usa a coluna `slug` conforme estava no arquivo original;
    -- se seu schema usa `catalog_slug`, altere aqui antes de rodar no Supabase.
    ALTER TABLE products
    ADD CONSTRAINT unique_user_slug UNIQUE (user_id, slug);
  END IF;
END$$;

-- Ajusta FK para remover imagens em cascata quando produto for deletado
ALTER TABLE product_images
DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;

ALTER TABLE product_images
ADD CONSTRAINT product_images_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;
