-- Adiciona campos de banners à tabela public_catalogs
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE public_catalogs 
ADD COLUMN IF NOT EXISTS banners text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banners_mobile text[] DEFAULT NULL;

-- Opcional: copiar banners existentes de settings para public_catalogs
UPDATE public_catalogs pc
SET 
  banners = s.banners,
  banners_mobile = s.banners_mobile
FROM settings s
WHERE pc.user_id = s.user_id
  AND (s.banners IS NOT NULL OR s.banners_mobile IS NOT NULL);
