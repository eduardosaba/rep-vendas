-- ========================================
-- AJUSTE DE CAPAS: Safilo P00 como Primária
-- ========================================
-- Este script garante que imagens da Safilo terminadas em "_P00" (foto frontal oficial)
-- sejam sempre marcadas como is_primary = true, pois são as fotos de capa do catálogo.
--
-- Padrão de URL Safilo: https://commportal-images.safilo.com/10/27/03/102703000300_P00.JPG
-- ========================================

-- 1. Desmarcar capas atuais APENAS de produtos que possuem fotos Safilo P00
-- (Garante que não afetamos produtos de outros fornecedores)
UPDATE public.product_images
SET is_primary = false
WHERE product_id IN (
    SELECT DISTINCT product_id 
    FROM public.product_images 
    WHERE url ILIKE '%safilo.com%_P00.%'
);

-- 2. Definir a Safilo P00 como a nova capa oficial
-- Se houver mais de uma P00 (raro), a primeira por ID será escolhida
WITH prioritized_safilo AS (
    SELECT id, 
           product_id,
           row_number() OVER (PARTITION BY product_id ORDER BY id) as rank
    FROM public.product_images
    WHERE url ILIKE '%safilo.com%_P00.%'
)
UPDATE public.product_images
SET 
  is_primary = true,
  position = 0
FROM prioritized_safilo
WHERE public.product_images.id = prioritized_safilo.id
AND prioritized_safilo.rank = 1;

-- 3. Ajustar posições das demais fotos para sequência lógica
-- (A capa fica na posição 0, as outras começam de 1)
WITH reordered AS (
    SELECT 
        id,
        row_number() OVER (PARTITION BY product_id ORDER BY is_primary DESC, position, id) - 1 as new_position
    FROM public.product_images
    WHERE product_id IN (
        SELECT DISTINCT product_id 
        FROM public.product_images 
        WHERE url ILIKE '%safilo.com%_P00.%'
    )
)
UPDATE public.product_images
SET position = reordered.new_position
FROM reordered
WHERE public.product_images.id = reordered.id;

-- ========================================
-- VERIFICAÇÃO (Execute para conferir o resultado)
-- ========================================
-- SELECT 
--   p.name,
--   pi.url,
--   pi.is_primary,
--   pi.position
-- FROM public.product_images pi
-- JOIN public.products p ON p.id = pi.product_id
-- WHERE pi.url ILIKE '%safilo.com%'
-- ORDER BY p.name, pi.position;
