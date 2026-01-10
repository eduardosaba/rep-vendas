-- ===================================================================
-- CORREÇÃO ESPECÍFICA: profiles.plan_id e profiles.plan
-- ===================================================================

-- 1. DIAGNÓSTICO: Ver estado atual dos profiles
SELECT 
    pr.id as user_id,
    pr.email,
    pr.plan_id as profile_plan_id,
    pr.plan as profile_plan,
    s.plan_id as subscription_plan_id,
    s.plan_name as subscription_plan_name,
    p.name as plan_real_name,
    p.product_limit
FROM profiles pr
LEFT JOIN subscriptions s ON s.user_id = pr.id
LEFT JOIN plans p ON p.id = s.plan_id
ORDER BY pr.created_at DESC;

-- 2. CORREÇÃO: Atualizar plan_id em profiles
-- Converter UUID para text e atualizar
UPDATE profiles pr
SET 
    plan_id = s.plan_id::text,
    updated_at = NOW()
FROM subscriptions s
WHERE s.user_id = pr.id
  AND s.plan_id IS NOT NULL;

-- 3. CORREÇÃO: Atualizar coluna "plan" se existir
-- Esta query só roda se a coluna "plan" existir na tabela
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'plan'
    ) THEN
        EXECUTE '
            UPDATE profiles pr
            SET 
                plan = s.plan_name,
                updated_at = NOW()
            FROM subscriptions s
            WHERE s.user_id = pr.id
              AND s.plan_name IS NOT NULL
        ';
    END IF;
END $$;

-- 4. VERIFICAÇÃO FINAL
SELECT 
    'DEPOIS DA CORREÇÃO' as status,
    pr.id as user_id,
    pr.email,
    pr.plan_id as profile_plan_id,
    pr.plan as profile_plan,
    s.plan_id as subscription_plan_id,
    s.plan_name as subscription_plan_name,
    p.product_limit,
    (SELECT COUNT(*) FROM products WHERE user_id = pr.id) as total_produtos
FROM profiles pr
LEFT JOIN subscriptions s ON s.user_id = pr.id
LEFT JOIN plans p ON p.id = s.plan_id
ORDER BY pr.created_at DESC;

-- ===================================================================
-- RESULTADO ESPERADO:
-- - profile_plan_id = UUID do plano (em formato text)
-- - profile_plan = nome do plano ('teste' ou 'Teste')
-- - Sincronizado com subscription
-- ===================================================================
