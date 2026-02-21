-- Migration: update products table to support gallery and image variants
-- Adds JSONB columns, indexes and ensures non-null defaults for new fields

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS image_variants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS image_path text,
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS image_optimized boolean DEFAULT false;

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_products_reference_code ON products (reference_code);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products (user_id);

-- Ensure JSONB columns are not null for existing rows
UPDATE products SET gallery_images = '[]'::jsonb WHERE gallery_images IS NULL;
UPDATE products SET image_variants = '[]'::jsonb WHERE image_variants IS NULL;
