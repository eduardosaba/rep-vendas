-- ===================================================================
-- CORREÇÃO COMPLETA: plan_id em subscriptions + profiles + settings
-- ===================================================================
-- PROBLEMA: 
--   1. Subscriptions criadas com plan_name mas sem plan_id
--   2. Profiles podem ter plan_id NULL
--   3. Settings pode ter plan_type='free' independente do plano real
-- SOLUÇÃO: Sincronizar todas as tabelas com o plano correto
-- ===================================================================

-- ========== PARTE 1: DIAGNÓSTICO COMPLETO ==========

-- 1.1 VERIFICAR SUBSCRIPTIONS SEM PLAN_ID
SELECT 
    'SUBSCRIPTIONS SEM PLAN_ID' as diagnostico,
    s.user_id,
    s.plan_name,
    s.plan_id,
    p.id as plan_real_id,
    p.product_limit,
    p.max_products
FROM subscriptions s
LEFT JOIN plans p ON p.name = s.plan_name
WHERE s.plan_id IS NULL
ORDER BY s.created_at DESC;

-- 1.2 VERIFICAR INCONSISTÊNCIAS EM PROFILES
SELECT 
    'PROFILES COM PROBLEMAS' as diagnostico,
    pr.id as user_id,
    pr.email,
    pr.plan_id as profile_plan_id,
    s.plan_id as subscription_plan_id,
    s.plan_name,
    p.product_limit
FROM profiles pr
LEFT JOIN subscriptions s ON s.user_id = pr.id
LEFT JOIN plans p ON p.id = s.plan_id
WHERE pr.plan_id IS NULL OR pr.plan_id != s.plan_id::text;

-- 1.3 VERIFICAR INCONSISTÊNCIAS EM SETTINGS
SELECT 
    'SETTINGS COM PLAN_TYPE INCORRETO' as diagnostico,
    st.user_id,
    st.plan_type as settings_plan_type,
    s.plan_name as subscription_plan_name,
    s.plan_id as subscription_plan_id,
    p.product_limit
FROM settings st
LEFT JOIN subscriptions s ON s.user_id = st.user_id
LEFT JOIN plans p ON p.id = s.plan_id
WHERE st.plan_type != s.plan_name OR st.plan_type IS NULL;

-- ========== PARTE 2: CORREÇÕES ==========

-- 2.1 ATUALIZAR PLAN_ID NAS SUBSCRIPTIONS
-- Esta query vincula o UUID correto do plano baseado no plan_name
UPDATE subscriptions s
SET 
    plan_id = p.id,
    updated_at = NOW()
FROM plans p
WHERE p.name = s.plan_name
  AND s.plan_id IS NULL;

-- 2.2 ATUALIZAR PLAN_ID NOS PROFILES
-- Sincroniza o plan_id do profile com a subscription (convertendo UUID para text)
UPDATE profiles pr
SET 
    plan_id = s.plan_id::text,
    updated_at = NOW()
FROM subscriptions s
WHERE s.user_id = pr.id
  AND s.plan_id IS NOT NULL
  AND (pr.plan_id IS NULL OR pr.plan_id != s.plan_id::text);

-- 2.3 ATUALIZAR PLAN_TYPE NOS SETTINGS
-- Sincroniza o plan_type do settings com o plan_name da subscription
UPDATE settings st
SET 
    plan_type = s.plan_name,
    updated_at = NOW()
FROM subscriptions s
WHERE s.user_id = st.user_id
  AND s.plan_name IS NOT NULL
  AND (st.plan_type IS NULL OR st.plan_type != s.plan_name);

-- ========== PARTE 3: VERIFICAÇÃO FINAL ==========

-- 3.1 VERIFICAR RESULTADO COMPLETO (TODAS AS TABELAS SINCRONIZADAS)
SELECT 
    'VERIFICAÇÃO COMPLETA' as relatorio,
    pr.id as user_id,
    pr.email,
    s.plan_name as subscription_plan_name,
    s.plan_id as subscription_plan_id,
    pr.plan_id as profile_plan_id,
    st.plan_type as settings_plan_type,
    p.product_limit,
    p.max_products,
    (SELECT COUNT(*) FROM products WHERE user_id = s.user_id) as total_produtos,
    CASE 
        WHEN s.plan_id IS NULL THEN '❌ Subscription sem plan_id'
        WHEN pr.plan_id IS NULL THEN '❌ Profile sem plan_id'
        WHEN pr.plan_id != s.plan_id::text THEN '❌ Profile/Subscription desincronizados'
        WHEN st.plan_type != s.plan_name THEN '⚠️ Settings com plan_type diferente'
        ELSE '✅ OK'
    END as status
FROM profiles pr
LEFT JOIN subscriptions s ON s.user_id = pr.id
LEFT JOIN settings st ON st.user_id = pr.id
LEFT JOIN plans p ON p.id = s.plan_id
ORDER BY pr.created_at DESC;

-- 3.2 CONTAR PROBLEMAS RESTANTES
SELECT 
    'RESUMO DE PROBLEMAS' as tipo,
    (SELECT COUNT(*) FROM subscriptions WHERE plan_id IS NULL) as subscriptions_sem_plan_id,
    (SELECT COUNT(*) FROM profiles pr 
     LEFT JOIN subscriptions s ON s.user_id = pr.id 
     WHERE pr.plan_id IS NULL OR pr.plan_id != s.plan_id::text) as profiles_desincronizados,
    (SELECT COUNT(*) FROM settings st 
     LEFT JOIN subscriptions s ON s.user_id = st.user_id 
     WHERE st.plan_type != s.plan_name OR st.plan_type IS NULL) as settings_desincronizados;

-- ===================================================================
-- RESULTADO ESPERADO:
-- - Todas subscriptions com plan_id preenchido (UUID válido)
-- - Todos profiles com plan_id sincronizado com subscription
-- - Todos settings com plan_type sincronizado com subscription.plan_name
-- - Produtos devem aparecer até o limite do plano (5000 para 'teste')
-- ===================================================================
