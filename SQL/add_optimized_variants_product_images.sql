-- ========================================
-- ADICIONAR COLUNA optimized_variants em product_images
-- ========================================
-- Data: 2026-02-04
-- Objetivo: Armazenar variantes otimizadas (480w, 1200w) por imagem da galeria

BEGIN;

-- 1) Adiciona coluna optimized_variants (JSONB) com valor padrão array vazio
ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS optimized_variants JSONB DEFAULT '[]'::jsonb;

-- 2) Comentário explicativo
COMMENT ON COLUMN product_images.optimized_variants IS
'Array de objetos {size, url, path} com variantes otimizadas por imagem (ex: [{"size":480,"url":"...","path":"..."}])';

-- 3) Índice GIN para consultas por conteúdo JSONB (opcional, recomendado para filtros/joins)
CREATE INDEX IF NOT EXISTS idx_product_images_optimized_variants_gin
ON product_images USING gin (optimized_variants);

COMMIT;

-- ========================================
-- VERIFICAÇÃO (executar após aplicar a migração)
-- ========================================
-- Verifica se a coluna existe
-- SELECT column_name FROM information_schema.columns WHERE table_name='product_images' AND column_name='optimized_variants';

-- Exemplo: mostrar algumas linhas com as novas variantes (deve retornar '[]' inicialmente)
-- SELECT id, product_id, optimized_variants FROM product_images WHERE optimized_variants IS NOT NULL LIMIT 5;
