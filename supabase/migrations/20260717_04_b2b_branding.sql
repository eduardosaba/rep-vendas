-- ========================================================================================
-- SUPABASE MIGRATION: 20260717_04_b2b_branding.sql
-- DESCRIPTION: Adiciona campos de customização estética e branding para as Distribuidoras
-- ========================================================================================

BEGIN;

-- Adiciona campos de identidade visual na tabela de organizações/distribuidoras
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0f172a',   -- Cor primária (Padrão: Slate-900)
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#2563eb', -- Cor secundária (Padrão: Blue-600)
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#f59e0b',    -- Cor de destaque (Padrão: Amber-500)
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,                     
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMIT;
