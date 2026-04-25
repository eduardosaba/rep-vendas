-- Migration: add banner_mode to settings and public_catalogs
-- Run in your DB: psql -f add_banner_mode_settings_public_catalogs.sql

BEGIN;

-- Add banner_mode to settings (per-user)
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS banner_mode text;

-- Add banner_mode to public_catalogs (public mirror)
ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS banner_mode text;

-- Optional: initialize from existing data if you kept local values elsewhere
-- UPDATE public_catalogs pc
-- SET banner_mode = s.banner_mode
-- FROM settings s
-- WHERE pc.user_id = s.user_id AND pc.banner_mode IS NULL AND s.banner_mode IS NOT NULL;

COMMIT;
