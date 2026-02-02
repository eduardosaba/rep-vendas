-- Migration: add image_url to short_links
-- Adds nullable image_url to associate a preview image with the short link
-- Idempotent: safe to run multiple times

BEGIN;

ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.short_links.image_url IS 'URL da imagem usada como preview para o link curto';

COMMIT;
