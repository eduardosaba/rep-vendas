-- Migration: Add about_text and shipping_policy to settings
-- Run in your Postgres environment (psql or Supabase SQL editor)

BEGIN;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS about_text TEXT;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS shipping_policy TEXT;

-- Rollback (if needed):
-- ALTER TABLE public.settings DROP COLUMN IF EXISTS about_text;
-- ALTER TABLE public.settings DROP COLUMN IF EXISTS shipping_policy;

COMMIT;
