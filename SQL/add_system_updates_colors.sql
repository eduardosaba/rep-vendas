-- Migration: add_system_updates_colors
-- Adiciona colunas color_from e color_to em system_updates

BEGIN;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS color_from varchar(32);

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS color_to varchar(32);

COMMIT;

-- Observações:
-- - Use tipos varchar(32) para armazenar valores hex (ex: #b9722e) ou nomes de cor.
-- - Se você preferir armazenar NULL como padrão, as colunas já permitem NULL.
-- - Após aplicar, a API que insere em `system_updates` deverá funcionar sem erro de schema cache.
