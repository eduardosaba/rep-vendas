-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT DEFAULT '#3B82F6',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Habilitar RLS para categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categories (verificar se já existem antes de criar)
DO $$
BEGIN
  -- Política de SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'Users can view their own categories'
  ) THEN
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
    CREATE POLICY "Users can view their own categories" ON categories
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Política de INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'Users can insert their own categories'
  ) THEN
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
    CREATE POLICY "Users can insert their own categories" ON categories
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Política de UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'Users can update their own categories'
  ) THEN
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
    CREATE POLICY "Users can update their own categories" ON categories
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Política de DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'Users can delete their own categories'
  ) THEN
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
    CREATE POLICY "Users can delete their own categories" ON categories
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verificar se o trigger já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Adicionar coluna category_id na tabela products (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;