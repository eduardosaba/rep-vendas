-- Script SQL para adicionar campo bestseller à tabela products
-- Execute este script diretamente no SQL Editor do Supabase

-- Verificar se a tabela products existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'products';

-- Verificar se a coluna bestseller já existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'bestseller';

-- Adicionar coluna bestseller se não existir
ALTER TABLE products ADD COLUMN IF NOT EXISTS bestseller BOOLEAN DEFAULT false;

-- Verificar novamente após a alteração
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'bestseller';

-- Exemplo: marcar alguns produtos como bestseller (opcional)
-- Descomente e ajuste os IDs dos produtos que você quer marcar como bestseller
-- UPDATE products SET bestseller = true WHERE id IN ('product-id-1', 'product-id-2');

-- Ver produtos marcados como bestseller
SELECT id, name, brand, bestseller
FROM products
WHERE bestseller = true
ORDER BY name;