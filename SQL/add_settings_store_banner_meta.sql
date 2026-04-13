-- Migration: adiciona coluna store_banner_meta em settings para armazenar modo de exibição global dos banners
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS store_banner_meta jsonb DEFAULT NULL;

-- Exemplo de valor esperado:
-- { "mode": "fit" }  // ou "fill", "stretch"
