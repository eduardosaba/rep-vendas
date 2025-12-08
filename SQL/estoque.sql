-- 1. Configurações Globais (Tabela Settings)
-- Define se a loja usa estoque e se permite vender quando acaba (Backorder)
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS enable_stock_management boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS global_allow_backorder boolean DEFAULT false;

-- 2. Campos do Produto (Tabela Products)
-- 'stock_quantity': O que está na prateleira física
-- 'track_stock': Se este produto específico deve ser controlado (ex: serviço não tem estoque)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;

-- 3. (Opcional) Função para Calcular Estoque Disponível
-- Esta função subtrai os itens reservados em pedidos 'pendentes'
-- Uso futuro: select * from get_product_availability(user_id)
CREATE OR REPLACE FUNCTION get_product_availability(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  physical_stock integer,
  reserved_stock bigint,
  available_stock bigint
) 
LANGUAGE sql
AS $$
  SELECT 
    p.id,
    p.name,
    p.stock_quantity,
    COALESCE(SUM(oi.quantity), 0) as reserved_stock,
    (p.stock_quantity - COALESCE(SUM(oi.quantity), 0)) as available_stock
  FROM products p
  LEFT JOIN order_items oi ON p.id = oi.product_id
  LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Pendente' -- Apenas pedidos pendentes reservam
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.name, p.stock_quantity;
$$;