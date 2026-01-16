-- Migration: 2026-01-16 - Add image_is_shared flag to products
-- Adds a boolean flag used by some scripts/front-end bundles to mark
-- whether the product image was synchronized/shared between catalogs.

ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_is_shared BOOLEAN DEFAULT FALSE;

-- Backfill: mark existing products with image_path as shared=false (no-op)
UPDATE products SET image_is_shared = FALSE WHERE image_is_shared IS NULL;

-- Index to help queries that filter by shared flag
CREATE INDEX IF NOT EXISTS idx_products_image_is_shared ON products(image_is_shared);
