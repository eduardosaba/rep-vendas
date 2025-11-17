-- Script para migrar marcas de produtos para tabela separada
-- Execute este script no SQL Editor do Supabase

-- PASSO 1: Criar tabela de marcas (se não existir)
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

-- PASSO 2: Habilitar RLS na tabela brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas RLS para brands
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

-- PASSO 4: Criar trigger para updated_at (se não existir)
DO $$
BEGIN
  -- Criar função se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;

  -- Criar trigger se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brands_updated_at') THEN
    CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- PASSO 5: Migrar marcas existentes dos produtos para a tabela brands
DO $$
DECLARE
    user_record RECORD;
    brand_name TEXT;
    brand_count INTEGER := 0;
BEGIN
    -- Para cada usuário que tem produtos
    FOR user_record IN SELECT DISTINCT user_id FROM products WHERE brand IS NOT NULL AND brand != ''
    LOOP
        -- Para cada marca única do usuário
        FOR brand_name IN SELECT DISTINCT brand FROM products WHERE user_id = user_record.user_id AND brand IS NOT NULL AND brand != ''
        LOOP
            -- Inserir marca se não existir
            INSERT INTO brands (name, user_id)
            VALUES (brand_name, user_record.user_id)
            ON CONFLICT (user_id, name) DO NOTHING;

            brand_count := brand_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Migração concluída! % marcas foram criadas ou já existiam.', brand_count;
END $$;

-- PASSO 6: Adicionar coluna brand_id na tabela products (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_id') THEN
    ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna brand_id adicionada à tabela products.';
  ELSE
    RAISE NOTICE 'Coluna brand_id já existe na tabela products.';
  END IF;
END $$;

-- PASSO 7: Atualizar produtos para usar brand_id em vez de brand (string)
UPDATE products
SET brand_id = brands.id
FROM brands
WHERE products.brand = brands.name
  AND products.user_id = brands.user_id
  AND products.brand IS NOT NULL
  AND products.brand != '';

-- PASSO 8: Verificar quantos produtos foram atualizados
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM products WHERE brand_id IS NOT NULL;
    RAISE NOTICE '% produtos foram associados às marcas na tabela brands.', updated_count;
END $$;

-- PASSO 9: Opcional - Manter coluna brand por compatibilidade, mas ela será descontinuada
-- A coluna brand (string) pode ser mantida temporariamente para compatibilidade

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE 'Agora você pode:';
    RAISE NOTICE '1. Ver as marcas em Gerenciar Marcas';
    RAISE NOTICE '2. Adicionar logos e percentuais de comissão';
    RAISE NOTICE '3. Usar o dropdown de marcas no cadastro de produtos';
END $$;