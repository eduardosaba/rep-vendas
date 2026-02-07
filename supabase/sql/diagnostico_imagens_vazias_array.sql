-- Diagnóstico: Verificar produtos com URLs vazias/nulas dentro do array images
-- Data: 2026-02-07
-- Contexto: Após cleanup de external_image_url, verificar se array images contém entradas inválidas

-- 1. Produtos com array images contendo strings vazias ou muito curtas
SELECT 
  id,
  name,
  brand,
  image_path,
  array_length(images, 1) as total_imagens,
  images
FROM products
WHERE user_id IN (
  SELECT target_user_id 
  FROM catalog_clones 
  WHERE source_user_id = (
    SELECT id FROM auth.users WHERE email LIKE '%template%' LIMIT 1
  )
)
AND images IS NOT NULL
AND array_length(images, 1) > 0
AND (
  -- Detecta strings vazias, muito curtas ou nulas no array
  EXISTS (
    SELECT 1 
    FROM unnest(images) AS img 
    WHERE img IS NULL 
       OR length(trim(img)) < 10
       OR img = ''
       OR img LIKE '%null%'
  )
)
LIMIT 20;

-- 2. Contar produtos afetados
SELECT COUNT(*) as produtos_com_imagens_invalidas
FROM products
WHERE images IS NOT NULL
  AND array_length(images, 1) > 0
  AND EXISTS (
    SELECT 1 
    FROM unnest(images) AS img 
    WHERE img IS NULL 
       OR length(trim(img)) < 10
       OR img = ''
  );

-- 3. Limpar entradas inválidas do array images
-- CUIDADO: Execute apenas após confirmar que as entradas realmente são inválidas
/*
UPDATE products
SET 
  images = (
    SELECT array_agg(img)
    FROM unnest(images) AS img
    WHERE img IS NOT NULL 
      AND length(trim(img)) >= 10
      AND img != ''
  ),
  updated_at = now()
WHERE images IS NOT NULL
  AND array_length(images, 1) > 0
  AND EXISTS (
    SELECT 1 
    FROM unnest(images) AS img 
    WHERE img IS NULL 
       OR length(trim(img)) < 10
       OR img = ''
  );
*/

-- 4. Verificar produto específico (exemplo do screenshot)
SELECT 
  id,
  name,
  image_path,
  external_image_url,
  image_url,
  array_length(images, 1) as total_imagens_array,
  images
FROM products
WHERE reference_code = 'TH 2365/F KY2'
   OR name LIKE '%TH 2365%'
   OR name LIKE '%TH2365%';
