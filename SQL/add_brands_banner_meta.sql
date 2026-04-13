-- Migration: adiciona colunas para armazenar metadados e variantes do banner
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS banner_meta jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner_variants jsonb DEFAULT NULL;

-- Nota: `banner_variants` pode ter a forma:
-- { "desktop": { "url": "...", "path": "..." }, "mobile": { ... } }
