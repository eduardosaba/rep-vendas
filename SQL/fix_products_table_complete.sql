-- Script completo para corrigir a tabela products no Supabase
-- Adiciona todas as colunas que podem estar faltando

-- Verificar estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Adicionar colunas faltantes na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS reference_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Para compatibilidade com o schema existente, permitir que price seja nullable inicialmente
-- e atualizar valores null para 0
UPDATE products SET price = 0 WHERE price IS NULL;
ALTER TABLE products ALTER COLUMN price SET NOT NULL;

-- Criar função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Atualizar registros existentes que não têm created_at definido
UPDATE products SET created_at = NOW() WHERE created_at IS NULL;

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'products';

-- Habilitar RLS se não estiver habilitado
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products';

-- Corrigir políticas RLS (produtos devem ser públicos para visualização no catálogo)
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Products are public for viewing" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Recriar políticas corretas
CREATE POLICY "Products are public for viewing" ON products
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Verificar algumas políticas
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products';

-- Teste: contar produtos
SELECT COUNT(*) as total_products FROM products;

-- Teste: verificar alguns produtos com as novas colunas
SELECT id, name, brand, reference_code, price, created_at, updated_at
FROM products
ORDER BY created_at DESC
LIMIT 3;