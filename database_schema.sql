-- Script para criar tabelas do sistema de vendas multi-tenant
-- Este script cria as tabelas apenas se não existirem

-- Criar tabelas apenas se não existirem

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  reference_code TEXT,
  brand TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  total_value DECIMAL(10,2) DEFAULT 0,
  order_type TEXT DEFAULT 'catalog',
  company_name TEXT,
  delivery_address TEXT,
  payment_method TEXT,
  notes TEXT,
  quick_brand TEXT,
  quick_quantity INTEGER,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  brand TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#F3F4F6',
  header_color TEXT DEFAULT '#FFFFFF',
  font_family TEXT DEFAULT 'Inter, sans-serif',
  title_color TEXT DEFAULT '#111827',
  icon_color TEXT DEFAULT '#4B5563',
  name TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  banner_url TEXT,
  email_provider TEXT,
  email_api_key TEXT,
  email_from TEXT,
  show_shipping BOOLEAN DEFAULT true,
  show_installments BOOLEAN DEFAULT true,
  hide_delivery_address BOOLEAN DEFAULT false,
  hide_installments BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabela de marcas
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Habilitar RLS (Row Level Security) apenas se não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products' AND relrowsecurity = true) THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'clients' AND relrowsecurity = true) THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders' AND relrowsecurity = true) THEN
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'order_items' AND relrowsecurity = true) THEN
    ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings' AND relrowsecurity = true) THEN
    ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'brands' AND relrowsecurity = true) THEN
    ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Políticas RLS para products (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can view their own products') THEN
    CREATE POLICY "Users can view their own products" ON products
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can insert their own products') THEN
    CREATE POLICY "Users can insert their own products" ON products
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can update their own products') THEN
    CREATE POLICY "Users can update their own products" ON products
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can delete their own products') THEN
    CREATE POLICY "Users can delete their own products" ON products
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Políticas RLS para clients (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can view their own clients') THEN
    CREATE POLICY "Users can view their own clients" ON clients
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can insert their own clients') THEN
    CREATE POLICY "Users can insert their own clients" ON clients
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can update their own clients') THEN
    CREATE POLICY "Users can update their own clients" ON clients
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can delete their own clients') THEN
    CREATE POLICY "Users can delete their own clients" ON clients
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Políticas RLS para orders (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders') THEN
    CREATE POLICY "Users can view their own orders" ON orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders') THEN
    CREATE POLICY "Users can insert their own orders" ON orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update their own orders') THEN
    CREATE POLICY "Users can update their own orders" ON orders
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can delete their own orders') THEN
    CREATE POLICY "Users can delete their own orders" ON orders
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Políticas RLS para order_items (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view their own order items') THEN
    CREATE POLICY "Users can view their own order items" ON order_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can insert their own order items') THEN
    CREATE POLICY "Users can insert their own order items" ON order_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can update their own order items') THEN
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
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can delete their own order items') THEN
    CREATE POLICY "Users can delete their own order items" ON order_items
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Políticas RLS para settings (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can view their own settings') THEN
    CREATE POLICY "Users can view their own settings" ON settings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can insert their own settings') THEN
    CREATE POLICY "Users can insert their own settings" ON settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can update their own settings') THEN
    CREATE POLICY "Users can update their own settings" ON settings
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can delete their own settings') THEN
    CREATE POLICY "Users can delete their own settings" ON settings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Políticas RLS para brands (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'Users can view their own brands') THEN
    CREATE POLICY "Users can view their own brands" ON brands
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'Users can insert their own brands') THEN
    CREATE POLICY "Users can insert their own brands" ON brands
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'Users can update their own brands') THEN
    CREATE POLICY "Users can update their own brands" ON brands
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'Users can delete their own brands') THEN
    CREATE POLICY "Users can delete their own brands" ON brands
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Adicionar colunas que podem estar faltando na tabela settings
DO $$
BEGIN
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'secondary_color') THEN
    ALTER TABLE settings ADD COLUMN secondary_color TEXT DEFAULT '#F3F4F6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'header_color') THEN
    ALTER TABLE settings ADD COLUMN header_color TEXT DEFAULT '#FFFFFF';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'font_family') THEN
    ALTER TABLE settings ADD COLUMN font_family TEXT DEFAULT 'Inter, sans-serif';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'title_color') THEN
    ALTER TABLE settings ADD COLUMN title_color TEXT DEFAULT '#111827';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'icon_color') THEN
    ALTER TABLE settings ADD COLUMN icon_color TEXT DEFAULT '#4B5563';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'name') THEN
    ALTER TABLE settings ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email') THEN
    ALTER TABLE settings ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'phone') THEN
    ALTER TABLE settings ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'logo_url') THEN
    ALTER TABLE settings ADD COLUMN logo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'banner_url') THEN
    ALTER TABLE settings ADD COLUMN banner_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email_provider') THEN
    ALTER TABLE settings ADD COLUMN email_provider TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email_api_key') THEN
    ALTER TABLE settings ADD COLUMN email_api_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'email_from') THEN
    ALTER TABLE settings ADD COLUMN email_from TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_shipping') THEN
    ALTER TABLE settings ADD COLUMN show_shipping BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_installments') THEN
    ALTER TABLE settings ADD COLUMN show_installments BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'hide_delivery_address') THEN
    ALTER TABLE settings ADD COLUMN hide_delivery_address BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_discount') THEN
    ALTER TABLE settings ADD COLUMN show_discount BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_old_price') THEN
    ALTER TABLE settings ADD COLUMN show_old_price BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_filter_price') THEN
    ALTER TABLE settings ADD COLUMN show_filter_price BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_filter_category') THEN
    ALTER TABLE settings ADD COLUMN show_filter_category BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_filter_bestseller') THEN
    ALTER TABLE settings ADD COLUMN show_filter_bestseller BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_filter_new') THEN
    ALTER TABLE settings ADD COLUMN show_filter_new BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_delivery_address_checkout') THEN
    ALTER TABLE settings ADD COLUMN show_delivery_address_checkout BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'show_payment_method_checkout') THEN
    ALTER TABLE settings ADD COLUMN show_payment_method_checkout BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Triggers para updated_at (apenas se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
    CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brands_updated_at') THEN
    CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;