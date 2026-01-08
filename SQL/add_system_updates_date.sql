-- Migration: add_system_updates_date
-- Adiciona coluna `date` na tabela `system_updates`

BEGIN;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS "date" date;

COMMIT;

-- Observações:
-- - A coluna `date` armazena a data exibida no changelog (formato DATE).
-- - Após aplicar, o endpoint que insere/ordena por `date` deve funcionar.
