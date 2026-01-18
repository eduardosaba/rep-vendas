-- Tabela para armazenar múltiplas fotos por produto
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sync_status TEXT DEFAULT 'pending',
    sync_error TEXT,
    position INTEGER DEFAULT 0, -- Para ordenar as fotos (Frente, Lado, Haste)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índice para busca rápida de fotos por produto
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- Migração de dados de colunas antigas (exemplo genérico, ajustar conforme necessidade)
-- INSERT INTO public.product_images (product_id, url, is_primary, sync_status)
-- SELECT id, image_url, true, sync_status FROM public.products WHERE image_url IS NOT NULL;
