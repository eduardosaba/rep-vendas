-- Migration: garante colunas usadas pelo fluxo de marketing/compartilhamento
-- 1) Adiciona og_image_url em public_catalogs (usado para preview/og image)
ALTER TABLE public.public_catalogs
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- 2) Garante que marketing_links tenha image_url e share_banner_url
ALTER TABLE public.marketing_links
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.marketing_links
  ADD COLUMN IF NOT EXISTS share_banner_url text;

-- Nota: execute essa migration no Supabase SQL Editor ou via psql
