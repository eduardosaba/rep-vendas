-- Migration: add_image_path_and_external_image_url.sql
-- Add columns to store internal storage path and external image url
-- Run this in Supabase SQL Editor or via psql connected to your database

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS image_path TEXT;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS external_image_url TEXT;

-- Optional: create index for quick queries on external_image_url
CREATE INDEX IF NOT EXISTS idx_products_external_image_url ON products (external_image_url);

-- Optional: create index on image_path
CREATE INDEX IF NOT EXISTS idx_products_image_path ON products (image_path);

-- Verify
-- SELECT id, name, reference_code, external_image_url, image_path FROM products LIMIT 10;
