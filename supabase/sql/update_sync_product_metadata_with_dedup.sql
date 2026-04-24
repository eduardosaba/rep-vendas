-- Atualiza/Cria RPC sync_product_metadata com deduplicação e upsert seguro
-- ATENÇÃO: revise os nomes das constraints (uq_*) conforme seu schema no Supabase.
-- Execute esta migração no Supabase (SQL editor ou supabase CLI).

-- Dependência: habilite a extensão uuid-ossp para `uuid_generate_v4()` se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.sync_product_metadata(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1) Deduplicate existing categories (keep the first id per normalized name)
  WITH ranked AS (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(trim(name)), user_id ORDER BY id) AS rn
      FROM categories
      WHERE user_id = p_user_id
    ) t
    WHERE t.rn > 1
  )
  DELETE FROM categories WHERE id IN (SELECT id FROM ranked);

  -- 2) Deduplicate existing product_genders
  WITH ranked_g AS (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(trim(name)), user_id ORDER BY id) AS rn
      FROM product_genders
      WHERE user_id = p_user_id
    ) t
    WHERE t.rn > 1
  )
  DELETE FROM product_genders WHERE id IN (SELECT id FROM ranked_g);

  -- 3) Insert distinct categories found in products (safe with ON CONFLICT DO NOTHING)
  INSERT INTO categories (id, name, image_url, user_id)
  SELECT uuid_generate_v4(), trim(p.category), NULL, p_user_id
  FROM (
    SELECT DISTINCT category
    FROM products
    WHERE user_id = p_user_id
      AND category IS NOT NULL
      AND trim(category) <> ''
  ) p
  ON CONFLICT ON CONSTRAINT uq_categories_user_name_individual DO NOTHING;

  -- 4) Insert distinct genders found in products
  INSERT INTO product_genders (id, name, image_url, user_id)
  SELECT uuid_generate_v4(), trim(p.gender), NULL, p_user_id
  FROM (
    SELECT DISTINCT gender
    FROM products
    WHERE user_id = p_user_id
      AND gender IS NOT NULL
      AND trim(gender) <> ''
  ) p
  ON CONFLICT ON CONSTRAINT uq_product_genders_user_name_individual DO NOTHING;

  -- 5) (Optional) You can extend here to sync other metadata (brands, materials, etc.)

  RETURN;
EXCEPTION WHEN others THEN
  -- Bubble up the error to the caller; let the client handle messaging.
  RAISE;
END;
$$;


-- FIM
