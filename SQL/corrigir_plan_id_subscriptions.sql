-- ===================================================================
-- CORREÇÃO: Vincular plan_id nas subscriptions existentes
-- ===================================================================
-- PROBLEMA: Subscriptions criadas com plan_name mas sem plan_id
-- SOLUÇÃO: Atualiza plan_id baseado no plan_name
-- ===================================================================

-- 1. VERIFICAR SUBSCRIPTIONS SEM PLAN_ID
SELECT 
    s.user_id,
    s.plan_name,
    s.plan_id,
    p.id as plan_real_id,
    p.product_limit
FROM subscriptions s
LEFT JOIN plans p ON p.name = s.plan_name
WHERE s.plan_id IS NULL
ORDER BY s.created_at DESC;

-- 2. ATUALIZAR PLAN_ID BASEADO NO PLAN_NAME
-- Esta query vincula o UUID correto do plano
UPDATE subscriptions s
SET 
    plan_id = p.id,
    updated_at = NOW()
FROM plans p
WHERE p.name = s.plan_name
  AND s.plan_id IS NULL;

-- 3. VERIFICAR RESULTADO
SELECT 
    s.user_id,
    s.plan_name,
    s.plan_id,
    p.product_limit,
    p.max_products,
    (SELECT COUNT(*) FROM products WHERE user_id = s.user_id) as total_produtos
FROM subscriptions s
LEFT JOIN plans p ON p.id = s.plan_id
ORDER BY s.created_at DESC;

-- 4. VERIFICAR SE HÁ ALGUMA SUBSCRIPTION AINDA SEM PLAN_ID
SELECT 
    COUNT(*) as subscriptions_sem_plan_id
FROM subscriptions
WHERE plan_id IS NULL;

-- ===================================================================
-- RESULTADO ESPERADO:
-- - Todas subscriptions com plan_id preenchido
-- - plan_id deve ser UUID válido
-- - Produtos devem aparecer até o limite do plano
-- ===================================================================
