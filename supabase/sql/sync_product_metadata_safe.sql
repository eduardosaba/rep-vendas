-- Safe sync_product_metadata function
-- Creates case-insensitive unique indexes (if missing) and a robust RPC
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create case-insensitive unique indexes to avoid duplicate inserts
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name_individual_idx
  ON categories ((lower(trim(name))), user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_genders_user_name_individual_idx
  ON product_genders ((lower(trim(name))), user_id);

-- Replace RPC with ON CONFLICT DO NOTHING to avoid reliance on a specific constraint name
CREATE OR REPLACE FUNCTION public.sync_product_metadata(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert distinct categories from products for the user
  INSERT INTO categories (id, name, user_id)
  SELECT uuid_generate_v4(), trim(category), p_user_id
  FROM products
  WHERE user_id = p_user_id AND category IS NOT NULL AND trim(category) <> ''
  ON CONFLICT DO NOTHING;

  -- Insert distinct genders from products for the user
  INSERT INTO product_genders (id, name, user_id)
  SELECT uuid_generate_v4(), trim(gender), p_user_id
  FROM products
  WHERE user_id = p_user_id AND gender IS NOT NULL AND trim(gender) <> ''
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Notes:
-- 1) This SQL creates unique indexes on lower(trim(name)) so that case/whitespace
--    variants are treated as the same value.
-- 2) The function uses ON CONFLICT DO NOTHING so it no longer depends on a
--    constraint name that might differ between environments.