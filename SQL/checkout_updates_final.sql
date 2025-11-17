-- Adicionar colunas necessárias para o checkout atualizado
-- Executar no SQL Editor do Supabase

-- Adicionar colunas na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar colunas na tabela order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);

-- Adicionar colunas na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS reference_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;

-- Adicionar colunas na tabela settings para configurações de checkout
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_discount BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_old_price BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_price BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_category BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_bestseller BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_new BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_delivery_address_checkout BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_payment_method_checkout BOOLEAN DEFAULT true;

-- Atualizar registros existentes com valores padrão
UPDATE settings SET
  show_discount = COALESCE(show_discount, true),
  show_old_price = COALESCE(show_old_price, true),
  show_filter_price = COALESCE(show_filter_price, true),
  show_filter_category = COALESCE(show_filter_category, true),
  show_filter_bestseller = COALESCE(show_filter_bestseller, true),
  show_filter_new = COALESCE(show_filter_new, true),
  show_delivery_address_checkout = COALESCE(show_delivery_address_checkout, true),
  show_payment_method_checkout = COALESCE(show_payment_method_checkout, true)
WHERE show_discount IS NULL OR show_old_price IS NULL OR show_filter_price IS NULL
   OR show_filter_category IS NULL OR show_filter_bestseller IS NULL
   OR show_filter_new IS NULL OR show_delivery_address_checkout IS NULL
   OR show_payment_method_checkout IS NULL;