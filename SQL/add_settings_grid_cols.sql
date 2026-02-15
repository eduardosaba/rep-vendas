-- Migration: add grid column settings
-- Adds columns to settings and public_catalogs to store responsive grid column counts

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS grid_cols_default integer,
  ADD COLUMN IF NOT EXISTS grid_cols_sm integer,
  ADD COLUMN IF NOT EXISTS grid_cols_md integer,
  ADD COLUMN IF NOT EXISTS grid_cols_lg integer,
  ADD COLUMN IF NOT EXISTS grid_cols_xl integer;

ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS grid_cols_default integer,
  ADD COLUMN IF NOT EXISTS grid_cols_sm integer,
  ADD COLUMN IF NOT EXISTS grid_cols_md integer,
  ADD COLUMN IF NOT EXISTS grid_cols_lg integer,
  ADD COLUMN IF NOT EXISTS grid_cols_xl integer;
