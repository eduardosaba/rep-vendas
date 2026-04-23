-- Migration: adiciona colunas para experiência rica do catálogo
-- Data: 2026-04-16

ALTER TABLE IF EXISTS companies
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB;

-- Compatibilidade: usamos JSONB para lista de imagens (ex: [{"url":"...","alt":"..."}, ...])
