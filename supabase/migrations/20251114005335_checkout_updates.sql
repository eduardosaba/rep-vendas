-- Adicionar campos necessários para checkout completo na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'boleto' CHECK (payment_method IN ('boleto', 'pix', 'cartao'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Atualizar o CHECK constraint do order_type para incluir 'catalog'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('quick_brand', 'full_catalog', 'catalog'));

-- Adicionar campo total_price na tabela order_items se não existir
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

-- Atualizar o campo total_price quando for null
UPDATE order_items SET total_price = unit_price * quantity WHERE total_price IS NULL;