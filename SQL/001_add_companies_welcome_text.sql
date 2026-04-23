-- Migration: Add welcome_text column to companies
-- Run in your Postgres environment (psql or migration tool)

BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS welcome_text TEXT;

-- Rollback (if needed):
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS welcome_text;

COMMIT;
