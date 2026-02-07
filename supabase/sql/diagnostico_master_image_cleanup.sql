-- Diagnóstico: Quantos produtos master precisam de limpeza de URLs?
-- Execute este script ANTES de aplicar a migration 20260207_cleanup_master_image_urls.sql

-- 1. Produtos master que têm image_path + URLs redundantes
SELECT 
  COUNT(*) as produtos_afetados,
  COUNT(DISTINCT user_id) as usuarios_afetados,
  COUNT(DISTINCT brand) as marcas_afetadas
FROM public.products
WHERE 
  image_path IS NOT NULL
  AND (image_url IS NOT NULL OR external_image_url IS NOT NULL);

-- 2. Detalhamento por usuário (top 10)
SELECT 
  COALESCE(prof.full_name, u.email) as nome_usuario,
  u.email,
  COUNT(*) as produtos_com_urls_redundantes
FROM public.products p
LEFT JOIN auth.users u ON u.id = p.user_id
LEFT JOIN public.profiles prof ON prof.id = p.user_id
WHERE 
  p.image_path IS NOT NULL
  AND (p.image_url IS NOT NULL OR p.external_image_url IS NOT NULL)
GROUP BY u.id, prof.full_name, u.email
ORDER BY produtos_com_urls_redundantes DESC
LIMIT 10;

-- 3. Exemplos de produtos que serão limpos
SELECT 
  id,
  name,
  brand,
  reference_code,
  image_path IS NOT NULL as tem_image_path,
  image_url IS NOT NULL as tem_image_url,
  external_image_url IS NOT NULL as tem_external_url
FROM public.products
WHERE 
  image_path IS NOT NULL
  AND (image_url IS NOT NULL OR external_image_url IS NOT NULL)
LIMIT 20;

-- INTERPRETAÇÃO DOS RESULTADOS:
-- - Se "produtos_afetados" > 0: há produtos master com URLs redundantes
-- - Esses produtos terão image_url e external_image_url setados para NULL
-- - A imagem principal continuará vindo de image_path (Storage)
-- - Isso eliminará duplicatas na galeria do catálogo principal
