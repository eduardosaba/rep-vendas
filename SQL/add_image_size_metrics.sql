-- =====================================================
-- MIGRATION: Adicionar métricas de performance de imagens
-- =====================================================
-- Propósito: Capturar tamanho original vs otimizado
-- para calcular economia de banda e storage
-- =====================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS original_size_kb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimized_size_kb INTEGER DEFAULT 0;

-- =====================================================
-- Índices para melhor performance em agregações
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_sizes 
ON public.products(original_size_kb, optimized_size_kb) 
WHERE sync_status = 'synced';

COMMENT ON COLUMN public.products.original_size_kb IS 
'Tamanho da imagem original baixada (KB) - usado para calcular economia de banda';

COMMENT ON COLUMN public.products.optimized_size_kb IS 
'Tamanho da versão medium WebP otimizada (KB) - referência de performance';
