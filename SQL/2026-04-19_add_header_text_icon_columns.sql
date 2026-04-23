-- Migração: adiciona colunas para cores do header (texto e ícones)
-- Execute com psql ou supabase CLI: psql "$DATABASE_URL" -f <file>

BEGIN;

-- Settings (privado)
ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS header_text_color text;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS header_icon_bg_color text;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS header_icon_color text;

-- Public catalogs (visíveis a visitantes)
ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS header_text_color text;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS header_icon_bg_color text;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS header_icon_color text;

COMMIT;

-- Observação: esta migração apenas adiciona as colunas. Se precisar backfill
-- a partir de algum valor padrão ou copiar valores de uma tabela para outra,
-- adicione UPDATEs adicionais após o COMMIT acima.
