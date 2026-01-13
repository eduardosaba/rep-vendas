-- Idempotent migration: add image_path and image_optimized if missing
BEGIN;

-- Add columns only if they do not already exist
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_path TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_optimized BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark as optimized where we already have internalized/storage URLs
UPDATE products
SET image_optimized = true
WHERE (image_path IS NOT NULL AND image_path <> '')
   OR (image_url IS NOT NULL AND (
        image_url LIKE '%product-images%'
     OR image_url LIKE '%/storage/v1/object/public/%'
   ));

COMMIT;

-- Note: This migration is safe to run multiple times. If you prefer to run
-- the backfill separately, remove the UPDATE above and run manually in a
-- controlled maintenance window.
