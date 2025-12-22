-- Migration: add_public_catalog_top_benefit_flags
-- Adiciona colunas content/visibility do top benefit em public_catalogs
-- Uso: executar no Supabase SQL Editor ou via psql

BEGIN;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_text text;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS show_top_benefit_bar boolean DEFAULT false;

COMMIT;

-- Observação: após aplicar, reinicie o servidor Next.js para limpar caches de schema.
