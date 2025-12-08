-- Migration: 2025-12-04 - Add imported_from_csv flag to staging_images
-- Idempotent: safe to run multiple times

ALTER TABLE staging_images ADD COLUMN IF NOT EXISTS imported_from_csv BOOLEAN DEFAULT FALSE;

-- Optional: small index to speed up queries filtering imported images
CREATE INDEX IF NOT EXISTS idx_staging_images_imported_flag ON staging_images (imported_from_csv);
