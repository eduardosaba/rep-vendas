-- ============================================================
-- MIGRAÇÃO COMPLETA: Sistema de Imagens RepVendas
-- Data: 3 de fevereiro de 2026
-- Descrição: SQL consolidado para funcionalidades de imagens
-- ============================================================
-- 
-- IMPORTANTE: Este script é IDEMPOTENTE (pode rodar múltiplas vezes)
-- Todas as operações usam IF NOT EXISTS / IF EXISTS
-- 
-- Execute no Supabase SQL Editor:
-- 1. Copie todo o conteúdo
-- 2. Cole no SQL Editor
-- 3. Clique em "Run"
-- ============================================================

-- ============================================================
-- PARTE 1: COLUNAS DE PRODUTOS (Imagens e Sincronização)
-- ============================================================

-- Galeria de imagens (array de URLs ou objetos JSON)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS images TEXT[];

-- Path da imagem no storage do Supabase
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS image_path TEXT;

-- URL externa original (antes da otimização)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS external_image_url TEXT;

-- Flag indicando se foi otimizada
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS image_optimized BOOLEAN NOT NULL DEFAULT false;

-- Variantes responsivas (320w, 640w, 1000w) em JSONB
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS image_variants JSONB;

-- Status da sincronização (pending, processing, synced, failed)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS sync_status TEXT;

-- Mensagem de erro caso sync falhe
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

COMMENT ON COLUMN products.images IS 'Array de URLs (antes do sync) ou objetos {url, path} (após sync)';
COMMENT ON COLUMN products.image_path IS 'Caminho da imagem capa otimizada no storage';
COMMENT ON COLUMN products.external_image_url IS 'URL externa original (ex: Safilo)';
COMMENT ON COLUMN products.image_variants IS 'Variantes responsivas: [{size, url, path}]';
COMMENT ON COLUMN products.sync_status IS 'Estado: pending|processing|synced|failed';

-- ============================================================
-- PARTE 2: TABELA product_images (Galeria)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  optimized_url TEXT,
  storage_path TEXT,
  optimized_variants JSONB,
  sync_status TEXT DEFAULT 'pending',
  is_primary BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sync_status ON product_images(sync_status);

COMMENT ON TABLE product_images IS 'Galeria de imagens dos produtos (múltiplas imagens por produto)';

-- ============================================================
-- PARTE 3: TABELA staging_images (Import Visual)
-- ============================================================

CREATE TABLE IF NOT EXISTS staging_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT,
  imported BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_images_user_id ON staging_images(user_id);

COMMENT ON TABLE staging_images IS 'Imagens temporárias do import visual antes de virar produtos';

-- ============================================================
-- PARTE 4: PROFILES (Marketing - Banner WhatsApp)
-- ============================================================

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS share_banner_url TEXT;

COMMENT ON COLUMN profiles.share_banner_url IS 'URL do banner usado em previews de WhatsApp/Social';

-- ============================================================
-- PARTE 5: PUBLIC_CATALOGS (Banner para SEO/OG)
-- ============================================================

-- Verifica se tabela existe antes de adicionar coluna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_catalogs') THEN
    ALTER TABLE public_catalogs 
      ADD COLUMN IF NOT EXISTS share_banner_url TEXT;
    
    COMMENT ON COLUMN public_catalogs.share_banner_url IS 'Banner para Open Graph (WhatsApp, Facebook)';
  END IF;
END $$;

-- ============================================================
-- PARTE 6: SHORT_LINKS (Link Encurtador com Preview)
-- ============================================================

-- Verifica se tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'short_links') THEN
    ALTER TABLE short_links 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    
    COMMENT ON COLUMN short_links.image_url IS 'Imagem de preview para o link encurtado';
  END IF;
END $$;

-- ============================================================
-- PARTE 7: RLS (Row Level Security) para product_images
-- ============================================================

-- Habilita RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Política: usuários veem apenas imagens dos próprios produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Users can view their own product images'
  ) THEN
    CREATE POLICY "Users can view their own product images" 
    ON product_images
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_images.product_id 
        AND products.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Users can insert their own product images'
  ) THEN
    CREATE POLICY "Users can insert their own product images" 
    ON product_images
    FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_images.product_id 
        AND products.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Users can update their own product images'
  ) THEN
    CREATE POLICY "Users can update their own product images" 
    ON product_images
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_images.product_id 
        AND products.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Users can delete their own product images'
  ) THEN
    CREATE POLICY "Users can delete their own product images" 
    ON product_images
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_images.product_id 
        AND products.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ============================================================
-- PARTE 8: RLS para staging_images
-- ============================================================

ALTER TABLE staging_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staging_images' 
    AND policyname = 'Users can view their own staging images'
  ) THEN
    CREATE POLICY "Users can view their own staging images" 
    ON staging_images
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staging_images' 
    AND policyname = 'Users can insert their own staging images'
  ) THEN
    CREATE POLICY "Users can insert their own staging images" 
    ON staging_images
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staging_images' 
    AND policyname = 'Users can delete their own staging images'
  ) THEN
    CREATE POLICY "Users can delete their own staging images" 
    ON staging_images
    FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- PARTE 9: BACKFILL (Migração de Dados Existentes)
-- ============================================================

-- Marca produtos que já têm imagens no storage como otimizados
UPDATE products
SET 
  image_optimized = true,
  sync_status = 'synced'
WHERE 
  sync_status IS NULL
  AND (
    (image_path IS NOT NULL AND image_path <> '')
    OR (image_url IS NOT NULL AND (
      image_url LIKE '%product-images%'
      OR image_url LIKE '%/storage/v1/object/public/%'
    ))
  );

-- Marca produtos com URLs externas como pending
UPDATE products
SET 
  sync_status = 'pending',
  external_image_url = image_url
WHERE 
  sync_status IS NULL
  AND image_url IS NOT NULL
  AND image_url LIKE 'http%'
  AND image_url NOT LIKE '%supabase%';

-- ============================================================
-- PARTE 10: FUNÇÕES AUXILIARES (Opcional)
-- ============================================================

-- Função para contar produtos pendentes de sincronização
CREATE OR REPLACE FUNCTION count_pending_sync()
RETURNS TABLE (
  pending_count BIGINT,
  synced_count BIGINT,
  failed_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE sync_status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE sync_status = 'synced') AS synced_count,
    COUNT(*) FILTER (WHERE sync_status = 'failed') AS failed_count
  FROM products
  WHERE user_id = auth.uid();
END;
$$;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================

-- Verificação pós-migração (copie e execute separadamente)
/*
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('images', 'image_path', 'image_variants', 'sync_status', 'external_image_url')
ORDER BY ordinal_position;

SELECT 
  table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE table_name IN ('products', 'product_images', 'staging_images')
GROUP BY table_name;

SELECT 
  sync_status,
  COUNT(*) as total
FROM products
GROUP BY sync_status;
*/
