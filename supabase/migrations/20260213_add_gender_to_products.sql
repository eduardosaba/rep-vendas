-- Migration: Adicionar campo gender à tabela products
-- Data: 2026-02-13
-- Descrição: Adiciona coluna gender para filtrar produtos por gênero (feminino, masculino, teen, unisex)

-- Adicionar coluna gender se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'gender'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN gender TEXT CHECK (gender IN ('feminino', 'masculino', 'teen', 'unisex'));
    
    -- Criar índice para melhor performance nas queries
    CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender) WHERE gender IS NOT NULL;
    
    -- Comentário na coluna
    COMMENT ON COLUMN products.gender IS 'Gênero do produto: feminino, masculino, teen ou unisex';
  END IF;
END $$;
