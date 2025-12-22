-- Migration: add_show_top_info_bar
-- Adiciona flag para exibir/ocultar a barra de informação superior

BEGIN;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS show_top_info_bar boolean DEFAULT true;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS show_top_info_bar boolean DEFAULT true;

COMMIT;

-- Após aplicar, reinicie o Next.js para atualizar schema cache.
