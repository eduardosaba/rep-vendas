-- Verificar estado atual da subscription e plano
SELECT 
  s.user_id,
  s.plan_id,
  s.plan_name,
  p.name as plan_real_name,
  p.product_limit,
  p.max_products,
  COUNT(pr.id) as total_produtos_cadastrados
FROM subscriptions s
LEFT JOIN plans p ON s.plan_id = p.id
LEFT JOIN products pr ON pr.user_id = s.user_id
WHERE s.user_id = auth.uid()
GROUP BY s.user_id, s.plan_id, s.plan_name, p.name, p.product_limit, p.max_products;

-- Se o product_limit acima for NULL ou não for 5000, execute este UPDATE:
UPDATE subscriptions
SET plan_id = (SELECT id FROM plans WHERE name IN ('Teste', 'teste') ORDER BY name DESC LIMIT 1)
WHERE user_id = auth.uid();
