-- Migration: adiciona coluna banner_variants em settings e migra dados existentes
BEGIN;

-- 1) Adiciona a coluna JSONB se não existir
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS banner_variants JSONB;

-- 2) Se já existe store_banner_meta.banner_variants, copie para a nova coluna
--    (compatível quando store_banner_meta é JSONB com chave banner_variants)
UPDATE public.settings
SET banner_variants = store_banner_meta->'banner_variants'
WHERE banner_variants IS NULL
  AND store_banner_meta IS NOT NULL
  AND jsonb_typeof(store_banner_meta) = 'object'
  AND store_banner_meta ? 'banner_variants';

COMMIT;

-- Nota: Após aplicar a migration, reinicie/force refresh do cache do PostgREST/Supabase
-- (ou reinicie o projeto no painel) para garantir que a nova coluna esteja visível.
