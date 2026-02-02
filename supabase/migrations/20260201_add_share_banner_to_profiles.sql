-- Migration: add share_banner_url to profiles
-- Creates a nullable text column used by marketing/share previews
-- Idempotent: safe to run multiple times

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_banner_url TEXT;

COMMENT ON COLUMN public.profiles.share_banner_url IS 'URL do banner usado em previews e compartilhamentos.';

COMMIT;
