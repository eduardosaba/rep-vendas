-- Migration: add footer_background_color to settings and public_catalogs
-- Add column footer_background_color to settings and public_catalogs if not exists

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS footer_background_color varchar(32);

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS footer_background_color varchar(32);

-- Optionally set a default for existing rows (uncomment if desired)
-- UPDATE public.settings SET footer_background_color = '#0d1b2c' WHERE footer_background_color IS NULL;
-- UPDATE public.public_catalogs SET footer_background_color = '#0d1b2c' WHERE footer_background_color IS NULL;
