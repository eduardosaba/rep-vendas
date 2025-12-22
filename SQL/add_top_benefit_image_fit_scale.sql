-- Migration: add_top_benefit_image_fit_scale.sql
-- Purpose: add `top_benefit_image_fit` and `top_benefit_image_scale` to `settings` and `public_catalogs`
-- Apply with psql / Supabase SQL editor

BEGIN;

-- Add to settings
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit VARCHAR(10) NOT NULL DEFAULT 'cover';

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER NOT NULL DEFAULT 100;

-- Ensure valid values for fit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_top_benefit_image_fit_check'
  ) THEN
    ALTER TABLE settings
      ADD CONSTRAINT settings_top_benefit_image_fit_check CHECK (top_benefit_image_fit IN ('cover','contain'));
  END IF;
END$$;

-- Ensure reasonable range for scale
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_top_benefit_image_scale_check'
  ) THEN
    ALTER TABLE settings
      ADD CONSTRAINT settings_top_benefit_image_scale_check CHECK (top_benefit_image_scale >= 50 AND top_benefit_image_scale <= 200);
  END IF;
END$$;

-- Add to public_catalogs (where public storefront reads)
ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit VARCHAR(10) NOT NULL DEFAULT 'cover';

ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER NOT NULL DEFAULT 100;

-- Add same constraints to public_catalogs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_catalogs_top_benefit_image_fit_check'
  ) THEN
    ALTER TABLE public_catalogs
      ADD CONSTRAINT public_catalogs_top_benefit_image_fit_check CHECK (top_benefit_image_fit IN ('cover','contain'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_catalogs_top_benefit_image_scale_check'
  ) THEN
    ALTER TABLE public_catalogs
      ADD CONSTRAINT public_catalogs_top_benefit_image_scale_check CHECK (top_benefit_image_scale >= 50 AND top_benefit_image_scale <= 200);
  END IF;
END$$;

-- Populate public_catalogs from settings where applicable
-- This copies values for matching user_id rows; adjust JOIN key if different in your schema.
UPDATE public_catalogs pc
SET
  top_benefit_image_fit = s.top_benefit_image_fit,
  top_benefit_image_scale = s.top_benefit_image_scale
FROM settings s
WHERE pc.user_id = s.user_id
  AND (pc.top_benefit_image_fit IS DISTINCT FROM s.top_benefit_image_fit
       OR pc.top_benefit_image_scale IS DISTINCT FROM s.top_benefit_image_scale);

COMMIT;

-- Notes:
-- - Default values are 'cover' and 100 (%). Constraint ranges: scale 50..200.
-- - After applying, restart any server/process that depends on cached DB schemas if necessary.
-- - If your `public_catalogs` join key differs, update the UPDATE ... FROM clause accordingly.
