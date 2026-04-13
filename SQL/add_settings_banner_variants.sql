-- Migration: adiciona coluna banner_variants na tabela settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS banner_variants jsonb DEFAULT NULL;

-- Estrutura esperada:
-- { banners: [ { original_url: "...", variants: { desktop: { url, path }, mobile: {...}, thumb: {...} } } ], banners_mobile: [...] }
