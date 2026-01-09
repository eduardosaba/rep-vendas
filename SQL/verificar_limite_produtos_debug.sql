-- =====================================================
-- DIAGNÓSTICO: Verificar configuração de limite de produtos
-- =====================================================

-- 1. Ver TODOS os planos disponíveis
SELECT 
  id, 
  name, 
  product_limit,
  max_products,
  created_at
FROM plans
ORDER BY name;

-- 2. Ver subscription do usuário atual (substitua USER_ID_AQUI pelo seu ID)
-- Para descobrir seu user_id, execute: SELECT auth.uid();
SELECT 
  s.id as subscription_id,
  s.user_id,
  s.plan_id,
  s.plan_name,
  p.name as plan_name_from_table,
  p.product_limit,
  p.max_products,
  s.status,
  s.created_at
FROM subscriptions s
LEFT JOIN plans p ON (s.plan_id = p.id OR s.plan_name = p.name)
WHERE s.user_id = auth.uid()
ORDER BY s.created_at DESC
LIMIT 1;

-- 3. Contar produtos do usuário
SELECT 
  COUNT(*) as total_produtos,
  user_id
FROM products
WHERE user_id = auth.uid()
GROUP BY user_id;

-- 4. CORREÇÃO: Ambos os planos 'Teste' e 'teste' já têm 5000 produtos!
-- Não precisa fazer nada aqui, mas vamos garantir:
UPDATE plans
SET 
  product_limit = 5000,
  max_products = 5000,
  updated_at = NOW()
WHERE name IN ('Teste', 'teste');

-- 5. CORREÇÃO: Atualizar subscription para usar um dos planos de teste
-- Prioriza 'Teste' (maiúsculo), mas aceita 'teste' (minúsculo)
UPDATE subscriptions s
SET 
  plan_id = (SELECT id FROM plans WHERE name IN ('Teste', 'teste') ORDER BY name DESC LIMIT 1),
  plan_name = (SELECT name FROM plans WHERE name IN ('Teste', 'teste') ORDER BY name DESC LIMIT 1)
WHERE s.user_id = auth.uid();

-- 6. Verificação FINAL - deve mostrar 5000
SELECT 
  s.user_id,
  s.plan_id,
  s.plan_name,
  p.product_limit,
  p.max_products,
  COUNT(pr.id) as total_produtos_importados
FROM subscriptions s
LEFT JOIN plans p ON (s.plan_id = p.id OR s.plan_name = p.name)
LEFT JOIN products pr ON pr.user_id = s.user_id
WHERE s.user_id = auth.uid()
GROUP BY s.user_id, s.plan_id, s.plan_name, p.product_limit, p.max_products;
