-- Migração inicial completa do banco de dados
-- Criar todas as tabelas necessárias com RLS e políticas
-- Versão idempotente - pode ser executada múltiplas vezes

-- Tabela: clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS se não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'clients' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can view own clients') THEN
        CREATE POLICY "Users can view own clients" ON clients
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can insert own clients') THEN
        CREATE POLICY "Users can insert own clients" ON clients
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can update own clients') THEN
        CREATE POLICY "Users can update own clients" ON clients
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can delete own clients') THEN
        CREATE POLICY "Users can delete own clients" ON clients
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Tabela: products
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    price NUMERIC(10,2),
    image_url TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS se não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'products' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Products are public for viewing') THEN
        CREATE POLICY "Products are public for viewing" ON products
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can insert own products') THEN
        CREATE POLICY "Users can insert own products" ON products
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can update own products') THEN
        CREATE POLICY "Users can update own products" ON products
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can delete own products') THEN
        CREATE POLICY "Users can delete own products" ON products
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Tabela: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Completo', 'Cancelado')),
    total_value NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_type TEXT DEFAULT 'full_catalog' CHECK (order_type IN ('quick_brand', 'full_catalog')),
    quick_brand TEXT,
    quick_quantity INTEGER,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS se não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'orders' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view own orders') THEN
        CREATE POLICY "Users can view own orders" ON orders
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert own orders') THEN
        CREATE POLICY "Users can insert own orders" ON orders
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update own orders') THEN
        CREATE POLICY "Users can update own orders" ON orders
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can delete own orders') THEN
        CREATE POLICY "Users can delete own orders" ON orders
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Tabela: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);

-- Habilitar RLS se não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'order_items' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view own order items') THEN
        CREATE POLICY "Users can view own order items" ON order_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM orders
                    WHERE orders.id = order_items.order_id
                    AND orders.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can insert own order items') THEN
        CREATE POLICY "Users can insert own order items" ON order_items
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM orders
                    WHERE orders.id = order_items.order_id
                    AND orders.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can update own order items') THEN
        CREATE POLICY "Users can update own order items" ON order_items
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

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can delete own order items') THEN
        CREATE POLICY "Users can delete own order items" ON order_items
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM orders
                    WHERE orders.id = order_items.order_id
                    AND orders.user_id = auth.uid()
                )
            );
    END IF;
END $$;