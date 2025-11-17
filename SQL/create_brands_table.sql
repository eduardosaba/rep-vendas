-- Script SQL para criar tabela de marcas
-- Execute este script diretamente no SQL Editor do Supabase

-- Criar tabela de marcas
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

-- Habilitar RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
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

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brands_updated_at') THEN
    CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;