-- Test script for clone_catalog_smart
-- Usage: run this in psql or via your DB client against a staging DB.
-- The script inserts a source user, a product with gallery and optimized metadata,
-- runs clone_catalog_smart to clone to a target user, then displays the cloned
-- product and its gallery. The script uses a transaction and rolls back at the end
-- so it is safe to run in staging.

BEGIN;

-- Fixed UUIDs for predictable inspection
DO $$
BEGIN
  -- no-op block to ensure transaction context
END$$;

-- Insert source and target profiles (no-op if already exist)
INSERT INTO public.profiles (id, full_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'SRC TEST', 'src@test.local')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'TGT TEST', 'tgt@test.local')
  ON CONFLICT (id) DO NOTHING;

-- Insert a product in the source user with optimized metadata and flags
INSERT INTO public.products (
  id, name, user_id, brand, image_path, image_url, external_image_url,
  sync_status, original_size_kb, optimized_size_kb, image_optimized,
  bestseller, is_launch, is_best_seller, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Test Product For Clone',
  '00000000-0000-0000-0000-000000000001',
  'BrandX',
  'test/path/product-1-medium.webp',
  'https://cdn.example.com/product-1-medium.webp',
  'https://external.example.com/product-1.jpg',
  'synced',
  4096,
  1024,
  true,
  true,
  true,
  true,
  now(), now()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert a gallery image for the source product
INSERT INTO public.product_images (
  product_id, url, is_primary, position, sync_status, sync_error, optimized_url, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'https://external.example.com/product-1-1.jpg',
  true,
  0,
  'synced',
  NULL,
  'https://cdn.example.com/product-1-1-optimized.webp',
  now(), now()
)
ON CONFLICT DO NOTHING;

-- Run the clone RPC for BrandX
SELECT * FROM public.clone_catalog_smart(
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  ARRAY['BrandX']::text[]
);

-- Inspect cloned product(s) for the target user
SELECT id, name, brand, original_product_id, sync_status, original_size_kb, optimized_size_kb, image_optimized, bestseller, is_launch, is_best_seller, image_path
FROM public.products
WHERE user_id = '00000000-0000-0000-0000-000000000002'
  AND original_product_id = '00000000-0000-0000-0000-000000000010'::uuid;

-- Inspect product_images for the cloned product
SELECT pi.*
FROM public.product_images pi
JOIN public.products p ON p.id = pi.product_id
WHERE p.user_id = '00000000-0000-0000-0000-000000000002'
  AND p.original_product_id = '00000000-0000-0000-0000-000000000010'::uuid
ORDER BY pi.position;

-- Cleanup: rollback so nothing persists
ROLLBACK;

/*
Expected results to validate manually:
- Cloned product present with sync_status = 'synced' (copied from source)
- original_size_kb and optimized_size_kb equal to source values
- image_optimized = true
- bestseller/is_launch/is_best_seller preserved as true
- product_images row copied and marked as 'synced' with optimized_url preserved
*/
