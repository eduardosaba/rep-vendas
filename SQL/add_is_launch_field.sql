-- Script SQL para adicionar campo is_launch à tabela products
-- Execute este script diretamente no SQL Editor do Supabase

-- Verificar se a tabela products existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'products';

-- Verificar se a coluna is_launch já existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_launch';

-- Adicionar coluna is_launch se não existir
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_launch BOOLEAN DEFAULT false;

-- Verificar novamente após a alteração
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_launch';

-- Exemplo: marcar alguns produtos como lançamento (opcional)
-- Descomente e ajuste os IDs dos produtos que você quer marcar como lançamento
-- UPDATE products SET is_launch = true WHERE id IN ('product-id-1', 'product-id-2');

-- Ver produtos marcados como lançamento
SELECT id, name, brand, is_launch
FROM products
WHERE is_launch = true
ORDER BY name;