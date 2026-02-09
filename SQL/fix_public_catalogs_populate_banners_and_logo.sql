-- Fix public_catalogs: ensure banner arrays and single_brand_logo_url are populated
-- Execute this on your Supabase/Postgres instance (psql or supabase cli)

BEGIN;

-- 1) Garantir que colunas de banners sejam arrays vazios quando NULL
UPDATE public_catalogs
SET banners = COALESCE(banners, '{}')::text[]
WHERE banners IS NULL;

UPDATE public_catalogs
SET banners_mobile = COALESCE(banners_mobile, '{}')::text[]
WHERE banners_mobile IS NULL;

-- 2) Popular single_brand_logo_url usando logo_url do catálogo quando estiver nulo ou vazio
UPDATE public_catalogs
SET single_brand_logo_url = COALESCE(NULLIF(TRIM(single_brand_logo_url), ''), logo_url)
WHERE single_brand_logo_url IS NULL OR TRIM(single_brand_logo_url) = '';

COMMIT;

-- Verificação rápida (exemplo para slug 'template')
-- SELECT id, user_id, slug, logo_url, single_brand_logo_url, banners, banners_mobile, is_active
-- FROM public_catalogs
-- WHERE slug = 'template' LIMIT 1;
