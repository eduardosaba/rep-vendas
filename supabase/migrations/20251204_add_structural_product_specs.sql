-- Migration: 2025-12-04 - Add structural product spec columns for matcher/indexing
-- Idempotent: usa IF NOT EXISTS

-- Colunas extraídas da technical_specs para permitir buscas/indexação
ALTER TABLE products ADD COLUMN IF NOT EXISTS bridge TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS temple TEXT; -- 'haste'
ALTER TABLE products ADD COLUMN IF NOT EXISTS height TEXT; -- 'altura'
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shape TEXT; -- formato
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT; -- tipo

-- Indexes para acelerar buscas/joins no matcher
CREATE INDEX IF NOT EXISTS idx_products_bridge ON products (bridge);
CREATE INDEX IF NOT EXISTS idx_products_size ON products (size);
CREATE INDEX IF NOT EXISTS idx_products_material ON products (material);
CREATE INDEX IF NOT EXISTS idx_products_temple ON products (temple);
CREATE INDEX IF NOT EXISTS idx_products_height ON products (height);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products (gender);
CREATE INDEX IF NOT EXISTS idx_products_shape ON products (shape);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products (product_type);

-- Observação: essas colunas são TEXT simples; se desejar consultas numéricas
-- (ex: tolerância em mm) para ponte/altura, avalie migrar para tipos numéricos
-- ou manter uma coluna adicional com valor numérico parseado.
