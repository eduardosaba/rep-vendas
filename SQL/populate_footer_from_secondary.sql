-- Migration: populate footer_background_color from secondary_color
-- Sets footer_background_color = secondary_color for existing rows where footer is NULL/empty

BEGIN;

-- Ensure columns exist (safe with IF NOT EXISTS)
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS footer_background_color varchar(32);

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS footer_background_color varchar(32);

-- Populate settings from secondary_color where footer_background_color is empty
UPDATE public.settings
SET footer_background_color = secondary_color
WHERE (footer_background_color IS NULL OR footer_background_color = '')
  AND secondary_color IS NOT NULL
  AND secondary_color <> '';

-- Populate public_catalogs from secondary_color where footer_background_color is empty
UPDATE public.public_catalogs pc
SET footer_background_color = pc.secondary_color
WHERE (pc.footer_background_color IS NULL OR pc.footer_background_color = '')
  AND pc.secondary_color IS NOT NULL
  AND pc.secondary_color <> '';

COMMIT;
