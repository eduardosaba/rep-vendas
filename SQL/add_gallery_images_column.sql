-- ========================================
-- ADICIONAR COLUNA gallery_images em products
-- ========================================
-- Data: 2026-02-04
-- Objetivo: Separar galeria da capa em campo dedicado

-- 1. Adicionar coluna
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- 2. Comentário explicativo
COMMENT ON COLUMN products.gallery_images IS 
'Array de objetos {url, path} APENAS da galeria (SEM capa). Exemplo: [{"url": "https://...", "path": "public/brands/tommy/TH2345-01-1200w.webp"}]';

-- 3. Índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_products_gallery_images_gin 
ON products USING gin (gallery_images);

-- ========================================
-- MIGRAÇÃO DE DADOS EXISTENTES
-- ========================================
-- Preencher gallery_images a partir de product_images
-- (Executar DEPOIS que o script de sync rodar ao menos 1 vez)

UPDATE products p
SET gallery_images = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'url', pi.optimized_url,
      'path', pi.storage_path
    ) ORDER BY pi.position
  ), '[]'::jsonb)
  FROM product_images pi
  WHERE pi.product_id = p.id
    AND pi.sync_status = 'synced'
    AND pi.is_primary = false  -- Exclui capa
)
WHERE EXISTS (
  SELECT 1 FROM product_images pi2
  WHERE pi2.product_id = p.id
    AND pi2.sync_status = 'synced'
    AND pi2.is_primary = false
);

-- ========================================
-- VERIFICAÇÃO
-- ========================================
SELECT 
  id,
  reference_code,
  -- Capa
  image_url as capa_url,
  image_path as capa_path,
  -- Galeria
  jsonb_array_length(gallery_images) as total_galeria,
  gallery_images
FROM products
WHERE gallery_images IS NOT NULL 
  AND jsonb_array_length(gallery_images) > 0
LIMIT 5;
