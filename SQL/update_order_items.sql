-- Script para atualizar a tabela order_items para suportar pedidos rápidos
-- Adicionar colunas brand e user_id se não existirem

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Atualizar registros existentes com user_id baseado no pedido
UPDATE order_items
SET user_id = orders.user_id
FROM orders
WHERE order_items.order_id = orders.id AND order_items.user_id IS NULL;

-- Tornar product_id opcional para pedidos rápidos
ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;