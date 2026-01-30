-- Migration: adicionar banner_url e description à tabela brands
-- Date: 2026-01-30

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_path TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Observações:
-- - `banner_url` armazena a URL pública (quando aplicável) ou externo.
-- - `banner_path` pode guardar o caminho/storage key quando o arquivo estiver no bucket privado.
-- - `description` é texto opcional exibido acima da lista de produtos da marca.
