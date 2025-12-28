-- Migration: adicionar coluna font_url para suportar fontes customizadas (woff2)

ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS platform_settings
  ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS global_configs
  ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;
