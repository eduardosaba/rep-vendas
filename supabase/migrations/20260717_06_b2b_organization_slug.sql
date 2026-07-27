-- ========================================================================================
-- SUPABASE MIGRATION: 20260717_06_b2b_organization_slug.sql
-- DESCRIPTION: Adiciona coluna slug único na tabela de organizações para URLs amigáveis
-- ========================================================================================

BEGIN;

-- 1. Adiciona a coluna slug
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Garante que os slugs existentes (caso haja) sejam únicos ou baseados no nome
UPDATE public.organizations
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 3. Define a coluna como NOT NULL (após popular) e adiciona a restrição de unicidade
ALTER TABLE public.organizations
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);

-- 4. Índice de alta performance para buscas na rota do catálogo
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

COMMIT;
