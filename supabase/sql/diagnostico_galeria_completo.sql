-- ============================================================
-- DIAGNÓSTICO COMPLETO: Estrutura de Imagens dos Produtos
-- Data: 7 de fevereiro de 2026
-- ============================================================
-- FOCO: Produtos com imagens (Tommy Hilfiger, Boss, etc)
-- OBJETIVO: Comparar estrutura entre master (criador) e clone (receptor)
-- ============================================================

-- 📋 ORDEM RECOMENDADA DE EXECUÇÃO:
-- 
-- 1. Query 1: Visão geral (quantos produtos têm cada campo)
-- 2. Query 2: Comparação Master vs Clone (detecta divergências) ⭐ PRINCIPAL
-- 3. Query 6: JSON lado a lado (vê estrutura completa)
-- 4. Query 7: Produtos problemáticos (URLs inválidas)
--
-- ============================================================

-- 1️⃣ VISÃO GERAL: Quantos produtos têm cada campo populado
-- ============================================================
SELECT 
  COUNT(*) as total_produtos,
  COUNT(*) FILTER (WHERE image_path IS NOT NULL) as com_image_path,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL) as com_image_url,
  COUNT(*) FILTER (WHERE external_image_url IS NOT NULL) as com_external_url,
  COUNT(*) FILTER (WHERE images IS NOT NULL) as com_images,
  COUNT(*) FILTER (WHERE gallery_images IS NOT NULL) as com_gallery_images,
  COUNT(*) FILTER (WHERE image_variants IS NOT NULL) as com_image_variants
FROM products;

-- 2️⃣ COMPARAÇÃO MASTER vs CLONE: Mesmo produto, estrutura diferente
-- ============================================================
-- Compara produtos com mesma referência entre usuários (master vs clone)
WITH product_comparison AS (
  SELECT 
    p1.reference_code,
    p1.name,
    p1.brand,
    
    -- MASTER (criador original)
    p1.user_id as master_user_id,
    CASE WHEN p1.image_path IS NOT NULL THEN '✅' ELSE '❌' END as master_image_path,
    CASE WHEN p1.gallery_images IS NOT NULL AND jsonb_array_length(p1.gallery_images) > 0 
         THEN jsonb_array_length(p1.gallery_images)::text ELSE '0' END as master_gallery_qtd,
    CASE WHEN p1.images IS NOT NULL THEN '✅' ELSE '❌' END as master_images_legado,
    
    -- CLONE (receptor)
    p2.user_id as clone_user_id,
    CASE WHEN p2.image_path IS NOT NULL THEN '✅' ELSE '❌' END as clone_image_path,
    CASE WHEN p2.gallery_images IS NOT NULL AND jsonb_array_length(p2.gallery_images) > 0 
         THEN jsonb_array_length(p2.gallery_images)::text ELSE '0' END as clone_gallery_qtd,
    CASE WHEN p2.images IS NOT NULL THEN '✅' ELSE '❌' END as clone_images_legado,
    
    -- Detectar diferenças
    CASE 
      WHEN (p1.images IS NOT NULL AND p2.images IS NULL) THEN '⚠️ MASTER tem images, CLONE não'
      WHEN (p1.images IS NULL AND p2.images IS NOT NULL) THEN '⚠️ CLONE tem images, MASTER não'
      WHEN (p1.gallery_images IS NOT NULL AND p2.gallery_images IS NULL) THEN '⚠️ MASTER tem gallery, CLONE não'
      ELSE '✅ Estrutura similar'
    END as diferenca
    
  FROM products p1
  INNER JOIN products p2 ON p1.reference_code = p2.reference_code AND p1.user_id != p2.user_id
  WHERE p1.brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
    AND (p1.image_path IS NOT NULL OR p1.gallery_images IS NOT NULL OR p1.images IS NOT NULL)
    AND p1.image_is_shared = true  -- Master (criador)
)
SELECT * FROM product_comparison
WHERE diferenca LIKE '%⚠️%'  -- Mostrar apenas divergências
LIMIT 20;

-- 2B️⃣ PRODUTOS COM IMAGENS: Focar em marcas populadas
-- ============================================================
SELECT 
  reference_code,
  name,
  brand,
  COALESCE(u.email, 'N/A') as usuario,
  -- Campos de imagem principal
  CASE WHEN image_path IS NOT NULL THEN '✅ SIM' ELSE '❌ NÃO' END as tem_image_path,
  CASE WHEN image_url IS NOT NULL THEN '✅ SIM' ELSE '❌ NÃO' END as tem_image_url,
  CASE WHEN external_image_url IS NOT NULL THEN '✅ SIM' ELSE '❌ NÃO' END as tem_external_url,
  
  -- Galeria
  CASE 
    WHEN gallery_images IS NOT NULL AND jsonb_typeof(gallery_images) = 'array' 
    THEN jsonb_array_length(gallery_images)
    ELSE 0 
  END as qtd_gallery,
  
  -- Images legado
  CASE 
    WHEN images IS NULL THEN 'NULL'
    WHEN jsonb_typeof(images) = 'array' THEN 'array[' || jsonb_array_length(images)::text || ']'
    WHEN jsonb_typeof(images) = 'string' THEN 'string'
    ELSE jsonb_typeof(images)
  END as tipo_images,
  
  -- Variantes
  CASE 
    WHEN image_variants IS NOT NULL AND jsonb_typeof(image_variants) = 'array' 
    THEN jsonb_array_length(image_variants)
    ELSE 0 
  END as qtd_variants,
  
  image_is_shared  -- Indica se é master (true) ou clone (false/null)
FROM products
LEFT JOIN auth.users u ON products.user_id = u.id
WHERE brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
  AND (image_path IS NOT NULL OR gallery_images IS NOT NULL OR images IS NOT NULL)
ORDER BY reference_code, image_is_shared DESC NULLS LAST
LIMIT 30;

-- 3️⃣ PRODUTOS COM IMAGES POPULADO: Ver conteúdo real + Usuário
-- ============================================================
SELECT 
  reference_code,
  brand,
  COALESCE(u.email, p.user_id::text) as usuario,
  image_is_shared as eh_master,
  jsonb_typeof(images) as tipo_images,
  CASE 
    WHEN jsonb_typeof(images) = 'array' THEN jsonb_array_length(images)
    ELSE NULL
  END as qtd_images,
  images::text as conteudo_images_preview,
  CASE WHEN gallery_images IS NOT NULL THEN jsonb_array_length(gallery_images) ELSE 0 END as qtd_gallery,
  CASE WHEN image_path IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_image_path
FROM products p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE images IS NOT NULL
  AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
ORDER BY brand, reference_code, image_is_shared DESC NULLS LAST
LIMIT 20;

-- 4️⃣ ANÁLISE POR MARCA: Produtos com galeria vs images
-- ============================================================
SELECT 
  brand,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0) as com_gallery,
  COUNT(*) FILTER (WHERE images IS NOT NULL) as com_images_legado,
  COUNT(*) FILTER (WHERE image_path IS NOT NULL) as com_storage
FROM products
WHERE brand IS NOT NULL
GROUP BY brand
ORDER BY total DESC
LIMIT 20;

-- 5️⃣ PRODUTOS PROBLEMÁTICOS: Identificar casos específicos
-- ============================================================
-- a) Tem image_path mas NÃO tem gallery_images (só capa, sem galeria)
SELECT 
  'Só capa, sem galeria' as tipo,
  COUNT(*) as quantidade
FROM products
WHERE image_path IS NOT NULL
  AND (gallery_images IS NULL OR jsonb_array_length(gallery_images) = 0);

-- b) Tem gallery_images E images ao mesmo tempo (conflito)
SELECT 
  'Conflito: gallery + images' as tipo,
  COUNT(*) as quantidade
FROM products
WHERE gallery_images IS NOT NULL 
  AND jsonb_array_length(gallery_images) > 0
  AND images IS NOT NULL;

-- c) Tem image_url E external_image_url E image_path (triplicado)
SELECT 
  'Triplicado: 3 fontes' as tipo,
  COUNT(*) as quantidade
FROM products
WHERE image_url IS NOT NULL
  AND external_image_url IS NOT NULL
  AND image_path IS NOT NULL;

-- 6️⃣ COMPARAÇÃO DETALHADA: JSON lado a lado (Master vs Clone)
-- ============================================================
WITH master_clone_pairs AS (
  SELECT 
    p1.reference_code,
    p1.brand,
    
    -- MASTER
    jsonb_build_object(
      'user', COALESCE(u1.email, p1.user_id::text),
      'image_path', p1.image_path,
      'image_url', p1.image_url,
      'external_image_url', p1.external_image_url,
      'gallery_images_count', CASE WHEN p1.gallery_images IS NOT NULL THEN jsonb_array_length(p1.gallery_images) ELSE 0 END,
      'images_type', jsonb_typeof(p1.images),
      'images_count', CASE WHEN p1.images IS NOT NULL AND jsonb_typeof(p1.images) = 'array' THEN jsonb_array_length(p1.images) ELSE 0 END,
      'images_sample', CASE WHEN p1.images IS NOT NULL THEN p1.images ELSE NULL END,
      'image_variants_count', CASE WHEN p1.image_variants IS NOT NULL THEN jsonb_array_length(p1.image_variants) ELSE 0 END
    ) as master_data,
    
    -- CLONE
    jsonb_build_object(
      'user', COALESCE(u2.email, p2.user_id::text),
      'image_path', p2.image_path,
      'image_url', p2.image_url,
      'external_image_url', p2.external_image_url,
      'gallery_images_count', CASE WHEN p2.gallery_images IS NOT NULL THEN jsonb_array_length(p2.gallery_images) ELSE 0 END,
      'images_type', jsonb_typeof(p2.images),
      'images_count', CASE WHEN p2.images IS NOT NULL AND jsonb_typeof(p2.images) = 'array' THEN jsonb_array_length(p2.images) ELSE 0 END,
      'images_sample', CASE WHEN p2.images IS NOT NULL THEN p2.images ELSE NULL END,
      'image_variants_count', CASE WHEN p2.image_variants IS NOT NULL THEN jsonb_array_length(p2.image_variants) ELSE 0 END
    ) as clone_data
    
  FROM products p1
  INNER JOIN products p2 ON p1.reference_code = p2.reference_code AND p1.user_id != p2.user_id
  LEFT JOIN auth.users u1 ON p1.user_id = u1.id
  LEFT JOIN auth.users u2 ON p2.user_id = u2.id
  WHERE p1.brand = 'TOMMY HILFIGER'
    AND p1.image_is_shared = true  -- Master
    AND (p1.image_path IS NOT NULL OR p1.gallery_images IS NOT NULL)
  LIMIT 5
)
SELECT 
  reference_code,
  brand,
  jsonb_pretty(master_data) as "📦 MASTER (Criador)",
  jsonb_pretty(clone_data) as "📦 CLONE (Receptor)"
FROM master_clone_pairs;

-- 7️⃣ ENCONTRAR PRODUTOS PROBLEMÁTICOS: URLs inválidas
-- ============================================================
-- a) Produtos com URLs quebradas/inválidas em images
SELECT 
  reference_code,
  brand,
  COALESCE(u.email, p.user_id::text) as usuario,
  image_is_shared as eh_master,
  images
FROM products p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE images IS NOT NULL
  AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
  AND (
    -- Verificar se tem valores inválidos
    images::text LIKE '%null%'
    OR images::text LIKE '%undefined%'
    OR images::text = '[]'::jsonb::text
    OR (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) = 0)
  )
LIMIT 20;

-- b) Produtos onde gallery_images está OK mas images tem lixo
SELECT 
  reference_code,
  brand,
  COALESCE(u.email, p.user_id::text) as usuario,
  'Conflito detectado' as problema,
  jsonb_array_length(gallery_images) as galeria_ok,
  jsonb_typeof(images) as images_tipo,
  images::text as images_conteudo
FROM products p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE gallery_images IS NOT NULL 
  AND jsonb_array_length(gallery_images) > 0
  AND images IS NOT NULL
  AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
LIMIT 10;
