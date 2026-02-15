-- Migration: drop grid column settings from settings and public_catalogs
-- Run this against your database (psql or Supabase SQL editor)

BEGIN;

ALTER TABLE IF EXISTS settings
  DROP COLUMN IF EXISTS grid_cols_default,
  DROP COLUMN IF EXISTS grid_cols_sm,
  DROP COLUMN IF EXISTS grid_cols_md,
  DROP COLUMN IF EXISTS grid_cols_lg,
  DROP COLUMN IF EXISTS grid_cols_xl;

ALTER TABLE IF EXISTS public_catalogs
  DROP COLUMN IF EXISTS grid_cols_default,
  DROP COLUMN IF EXISTS grid_cols_sm,
  DROP COLUMN IF EXISTS grid_cols_md,
  DROP COLUMN IF EXISTS grid_cols_lg,
  DROP COLUMN IF EXISTS grid_cols_xl;

COMMIT;
