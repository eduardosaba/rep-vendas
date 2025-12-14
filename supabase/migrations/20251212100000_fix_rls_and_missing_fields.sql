-- 2025-12-12: Corrigir políticas RLS e colunas faltantes para restaurar funcionalidades
-- Objetivo: restaurar leitura pública do catálogo (produtos/brands), garantir colunas esperadas,
-- e reiniciar políticas que restrinjam escritas apenas ao proprietário (auth.uid()).
-- Aplique em staging primeiro e faça backup.

BEGIN;

-- 1) Garantir colunas essenciais em `products`
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bestseller BOOLEAN DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_launch BOOLEAN DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS external_image_url TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 2) Garantir tabela `brands` mínima (se removida acidentalmente)
-- Não recriaremos dados; apenas garante existência da tabela com colunas básicas.
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);

-- 3) Habilitar RLS nas tabelas relevantes
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

-- 4) Restaurar políticas para `products`
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- 5) Políticas para `brands` (leitura pública, escrita por proprietário)
DROP POLICY IF EXISTS "Public read brands" ON brands;
CREATE POLICY "Public read brands" ON brands
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own brands" ON brands;
CREATE POLICY "Users can insert their own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brands" ON brands;
CREATE POLICY "Users can update their own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brands" ON brands;
CREATE POLICY "Users can delete their own brands" ON brands
  FOR DELETE USING (auth.uid() = user_id);

-- 6) Saved carts: manter políticas compatíveis com guest_id (se existir) e com user owner
-- Recriar políticas minimamente seguras
DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
  FOR SELECT USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can update own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can update own saved carts (owner)" ON saved_carts
  FOR UPDATE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  ) WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can delete own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can delete own saved carts (owner)" ON saved_carts
  FOR DELETE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

-- 7) Orders + order_items: restaurar políticas de propriedade (somente owner pode ver/manipular)
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
CREATE POLICY "Users can insert their own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;
CREATE POLICY "Users can delete their own orders" ON orders
  FOR DELETE USING (auth.uid() = user_id);

-- order_items: leitura/escrita apenas se o pedido pertence ao usuário
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;
CREATE POLICY "Users can insert their own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own order items" ON order_items;
CREATE POLICY "Users can update their own order items" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own order items" ON order_items;
CREATE POLICY "Users can delete their own order items" ON order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 8) Clients and settings: owner-only access
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
CREATE POLICY "Users can view their own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
CREATE POLICY "Users can insert their own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
CREATE POLICY "Users can update their own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;
CREATE POLICY "Users can delete their own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
CREATE POLICY "Users can view their own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
CREATE POLICY "Users can insert their own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
CREATE POLICY "Users can update their own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON settings;
CREATE POLICY "Users can delete their own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;

-- Instruções após aplicação:
-- 1) Verificar se os produtos podem ser lidos anonimamente na UI (catalogo público).
-- 2) Verificar se usuários autenticados conseguem criar/editar/excluir produtos e marcas.
-- 3) Registrar erros no log do Supabase para ajustar políticas específicas se necessário.
-- 4) Se desejar políticas mais restritivas de leitura, podemos alterar "Public read products" para
--    limitar por `user_id = current_setting('app.catalog_user_id', true)` e fazer o cliente setar esse GUC via RPC antes de consultas.
