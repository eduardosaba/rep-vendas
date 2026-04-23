-- Migration: add social handles/urls, footer_text_color and catalog PDF fields
-- Add missing columns to settings, public_catalogs and companies
-- Executar com psql ou via sua ferramenta de migração preferida

BEGIN;

-- SETTINGS
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_handle text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS linkedin_handle text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS catalog_pdf_url text,
  ADD COLUMN IF NOT EXISTS show_pdf_catalog boolean,
  ADD COLUMN IF NOT EXISTS footer_text_color text;

-- PUBLIC_CATALOGS
ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS catalog_pdf_url text,
  ADD COLUMN IF NOT EXISTS footer_text_color text;

-- COMPANIES (canonical company row)
ALTER TABLE IF EXISTS companies
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_handle text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS linkedin_handle text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS catalog_pdf_url text,
  ADD COLUMN IF NOT EXISTS footer_text_color text;

COMMIT;

-- Observações:
-- 1) Tipos usados: text para URLs/handles/cores; boolean para show_pdf_catalog.
-- 2) Se desejar tipos mais restritos (ex: footer_text_color varchar(9)), substitua conforme necessário.
-- 3) Rode um analyze/vacuum após a migração em ambientes de produção, se apropriado.
