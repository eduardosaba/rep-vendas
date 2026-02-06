-- Migration: add logo_path and banner_path to brands and backfill from public URLs
-- Date: 2026-02-06

ALTER TABLE IF EXISTS public.brands
ADD COLUMN IF NOT EXISTS logo_path text;

ALTER TABLE IF EXISTS public.brands
ADD COLUMN IF NOT EXISTS banner_path text;

-- Backfill logo_path from logo_url when possible (expects Supabase public URL format)
UPDATE public.brands
SET logo_path = substring(logo_url FROM '/storage/v1/object/public/(.*)$')
WHERE logo_url IS NOT NULL AND logo_path IS NULL;

UPDATE public.brands
SET banner_path = substring(banner_url FROM '/storage/v1/object/public/(.*)$')
WHERE banner_url IS NOT NULL AND banner_path IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.brands.logo_path IS 'Internal storage path for logo (e.g. userId/brands/logo/123.jpg)';
COMMENT ON COLUMN public.brands.banner_path IS 'Internal storage path for banner (e.g. userId/brands/banner/123.jpg)';
