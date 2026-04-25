-- Migration: Add banners column to public_catalogs
-- Adds a jsonb column `banners` to store desktop banner URLs.
-- Run with psql or your DB migration tool. Backup before applying.

ALTER TABLE public_catalogs
  ADD COLUMN IF NOT EXISTS banners jsonb DEFAULT '[]'::jsonb;

-- Optional: add a GIN index for faster searches on array values
CREATE INDEX IF NOT EXISTS idx_public_catalogs_banners_gin ON public_catalogs USING gin (banners);

-- Update existing rows with null to empty array for consistency
UPDATE public_catalogs SET banners = '[]'::jsonb WHERE banners IS NULL;
