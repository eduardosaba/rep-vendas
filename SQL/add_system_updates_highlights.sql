-- Migration: add_system_updates_highlights
-- Adiciona coluna `highlights` (array de text) na tabela `system_updates`

BEGIN;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}'::text[];

COMMIT;

-- Observações:
-- - A coluna `highlights` armazena o array de strings mostrado no changelog.
-- - Definimos DEFAULT '{}' para evitar NULLs e facilitar leituras no frontend.
