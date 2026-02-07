-- Script de Diagnóstico: Galeria Duplicada em Clones
-- Execute no SQL Editor do Supabase

-- ===== ETAPA 1: Verificar produtos clonados com múltiplas URLs de imagem =====
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.brand,
  p.reference_code,
  p.image_path,
  p.image_url,
  p.external_image_url,
  p.image_is_shared,
  CASE 
    WHEN p.image_path IS NOT NULL AND (p.external_image_url IS NOT NULL OR p.image_url IS NOT NULL) 
    THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END AS status
FROM products p
WHERE p.image_is_shared = true
  AND p.image_path IS NOT NULL
  AND (p.external_image_url IS NOT NULL OR p.image_url IS NOT NULL)
ORDER BY p.created_at DESC
LIMIT 20;

-- ===== ETAPA 2: Contar produtos afetados =====
SELECT 
  COUNT(*) AS total_produtos_duplicados,
  COUNT(DISTINCT user_id) AS usuarios_afetados
FROM products
WHERE image_is_shared = true
  AND image_path IS NOT NULL
  AND (external_image_url IS NOT NULL OR image_url IS NOT NULL);

-- ===== ETAPA 3: Ver por usuário =====
SELECT 
  u.email AS usuario_email,
  COUNT(p.id) AS produtos_duplicados
FROM products p
LEFT JOIN profiles u ON u.id = p.user_id
WHERE p.image_is_shared = true
  AND p.image_path IS NOT NULL
  AND (p.external_image_url IS NOT NULL OR p.image_url IS NOT NULL)
GROUP BY u.email
ORDER BY produtos_duplicados DESC;

-- ===== ETAPA 4: Ver exemplo de produto afetado (JSON completo) =====
SELECT row_to_json(p) AS produto_exemplo
FROM products p
WHERE p.image_is_shared = true
  AND p.image_path IS NOT NULL
  AND (p.external_image_url IS NOT NULL OR p.image_url IS NOT NULL)
LIMIT 1;

-- ===== RESULTADO ESPERADO =====
-- Se retornar linhas, você TEM o problema de duplicação
-- Se retornar 0 linhas, está tudo OK

-- ===== PRÓXIMO PASSO =====
-- Se encontrou produtos duplicados, aplique a correção descrita em:
-- CORRECAO_GALERIA_DUPLICADA.md
