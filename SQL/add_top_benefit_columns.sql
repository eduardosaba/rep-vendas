-- Migration: add_top_benefit_columns
-- Adiciona colunas para configurar a barra de benefícios (top benefit)
-- Aplica tanto em `settings` (private per-user) quanto em `public_catalogs` (sincronizado)

BEGIN;

-- Settings (por usuário)
ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS top_benefit_image_url text;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS top_benefit_height integer DEFAULT 36;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS top_benefit_text_size integer DEFAULT 11;

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color varchar(32) DEFAULT '#f3f4f6';

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS top_benefit_text_color varchar(32) DEFAULT '#b9722e';

-- Public catalog (dados públicos/sincronizados)
ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_image_url text;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_height integer;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_text_size integer;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color varchar(32);

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS top_benefit_text_color varchar(32);

COMMIT;

-- Observações:
-- 1) Colunas em `settings` recebem valores padrão compatíveis com UI.
-- 2) Em `public_catalogs` optamos por não inserir defaults aqui — o sync
--    do backend populates esses campos quando o usuário salva settings.
-- 3) Após aplicar a migration, atualize as policies RLS se necessário.
