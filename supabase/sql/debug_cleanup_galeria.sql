-- Debug: Por que o UPDATE não afetou nenhuma linha?
-- Execute estas queries em ordem para diagnosticar

-- QUERY 1: Verificar se ainda há produtos com o problema
SELECT COUNT(*) AS total_com_problema
FROM products
WHERE image_is_shared = true
  AND image_path IS NOT NULL
  AND (external_image_url IS NOT NULL OR image_url IS NOT NULL);

-- QUERY 2: Ver detalhes dos produtos afetados
SELECT 
  id,
  name,
  brand,
  image_is_shared,
  image_path IS NOT NULL AS tem_image_path,
  external_image_url IS NOT NULL AS tem_external,
  image_url IS NOT NULL AS tem_image_url,
  CASE 
    WHEN image_path IS NULL THEN '❌ SEM image_path'
    WHEN image_is_shared IS NOT TRUE THEN '❌ image_is_shared não é TRUE'
    WHEN external_image_url IS NULL AND image_url IS NULL THEN '❌ Já limpo'
    ELSE '✅ Deveria ser afetado'
  END AS status
FROM products
WHERE user_id IN (
  SELECT DISTINCT target_user_id FROM catalog_clones
)
ORDER BY created_at DESC
LIMIT 20;

-- QUERY 3: Verificar o produto específico do exemplo
SELECT 
  id,
  name,
  image_is_shared,
  image_path,
  external_image_url,
  image_url
FROM products
WHERE id = '5b375857-0586-44b5-acaa-711a851f896f';

-- QUERY 4: Tentar UPDATE mais específico (só para este produto de teste)
-- Remova o comentário abaixo para executar:
/*
UPDATE products
SET 
  external_image_url = NULL,
  image_url = NULL,
  updated_at = now()
WHERE id = '5b375857-0586-44b5-acaa-711a851f896f'
  AND image_path IS NOT NULL;
*/

-- QUERY 5: Verificar se image_is_shared é boolean ou texto
SELECT 
  pg_typeof(image_is_shared) AS tipo_coluna,
  image_is_shared,
  image_is_shared = true AS comparacao_true,
  image_is_shared IS TRUE AS comparacao_is_true
FROM products
WHERE id = '5b375857-0586-44b5-acaa-711a851f896f';

-- QUERY 6: UPDATE alternativo com IS TRUE ao invés de = true
/*
UPDATE products
SET 
  external_image_url = NULL,
  image_url = NULL,
  updated_at = now()
WHERE image_is_shared IS TRUE
  AND image_path IS NOT NULL
  AND (external_image_url IS NOT NULL OR image_url IS NOT NULL);
*/
