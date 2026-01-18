-- Garante que a tabela product_images existe e tem as políticas de segurança corretas.
-- Execute este script no Supabase SQL Editor para habilitar a galeria de imagens.

-- 1. Criação da Tabela (se não existir)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sync_status TEXT DEFAULT 'pending',
    sync_error TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- 3. Habilitar RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas para evitar duplicação ao rodar novamente
DROP POLICY IF EXISTS "Users can view images of their own products" ON public.product_images;
DROP POLICY IF EXISTS "Users can insert images to their own products" ON public.product_images;
DROP POLICY IF EXISTS "Users can update images of their own products" ON public.product_images;
DROP POLICY IF EXISTS "Users can delete images of their own products" ON public.product_images;
DROP POLICY IF EXISTS "Public read access for catalog images" ON public.product_images;

-- 5. Criar Políticas de Segurança
-- Leitura (Dono)
CREATE POLICY "Users can view images of their own products" 
ON public.product_images FOR SELECT 
USING (
  product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  )
);

-- Inserção (Dono)
CREATE POLICY "Users can insert images to their own products" 
ON public.product_images FOR INSERT 
WITH CHECK (
  product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  )
);

-- Atualização (Dono)
CREATE POLICY "Users can update images of their own products" 
ON public.product_images FOR UPDATE 
USING (
  product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  )
);

-- Deleção (Dono)
CREATE POLICY "Users can delete images of their own products" 
ON public.product_images FOR DELETE 
USING (
  product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  )
);

-- Leitura Pública (necessário para o Catálogo Virtual ver as imagens sem login, se aplicável)
-- Se o seu catálogo for público, descomente a linha abaixo ou ajuste a policy de bucket
-- CREATE POLICY "Public read access for catalog images" ON public.product_images FOR SELECT USING (true);
