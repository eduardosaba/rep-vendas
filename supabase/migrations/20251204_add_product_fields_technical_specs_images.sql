-- Migration: 2025-12-04 - Add product fields for import features
-- Idempotent: usa IF NOT EXISTS para poder ser executada múltiplas vezes.

-- Adiciona campo para ficha técnica (JSON stringificado pelo frontend)
ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_specs TEXT;

-- Adiciona array de URLs das imagens (galeria)
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[];

-- Campos auxiliares usados pelo frontend/importador
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;

-- Flags e estoque
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_launch BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE;

-- Observações:
-- 1) O frontend atual grava `technical_specs` como uma string JSON (ex: "[ { key, value }, ... ]").
--    Mantemos `TEXT` para compatibilidade e simplicidade; se preferir consultas JSONB, considere
--    usar `ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_specs_json JSONB;` e migrar.
-- 2) As políticas RLS existentes que usam `user_id` não precisam ser alteradas apenas por adicionar colunas.
