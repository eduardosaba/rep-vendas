-- Migration: Add tipo_montagem to products table
-- Milestone 4: Tipo de Montagem / Armação Ótica (aro_fechado, fio_nylon, balgriff)

ALTER TABLE products
ADD COLUMN IF NOT EXISTS tipo_montagem text;

-- Restrição de integridade para garantir valores padronizados
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_tipo_montagem_check;

ALTER TABLE products
ADD CONSTRAINT chk_products_tipo_montagem
CHECK (
  tipo_montagem IS NULL
  OR tipo_montagem IN (
    'aro_fechado',
    'fio_nylon',
    'balgriff'
  )
);

-- Índice para acelerar a busca distinta por tipos no catálogo virtual
CREATE INDEX IF NOT EXISTS idx_products_tipo_montagem ON products(tipo_montagem) WHERE is_active = true;

COMMENT ON COLUMN products.tipo_montagem IS 'Tipo de montagem da armação óptica (aro_fechado, fio_nylon, balgriff).';
