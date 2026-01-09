-- =====================================================
-- SCRIPT SIMPLES: ADICIONAR/ATUALIZAR PLANO TESTE
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Verifica se o plano 'teste' já existe e atualiza ou cria
DO $$
DECLARE
  plano_id UUID;
BEGIN
  -- Tenta encontrar o plano 'teste' (case insensitive)
  SELECT id INTO plano_id 
  FROM plans 
  WHERE LOWER(name) = 'teste' 
  LIMIT 1;

  IF plano_id IS NOT NULL THEN
    -- Se existe, atualiza o limite
    UPDATE plans 
    SET product_limit = 5000,
        updated_at = NOW()
    WHERE id = plano_id;
    
    RAISE NOTICE 'Plano TESTE atualizado com sucesso! Limite: 5000 produtos';
  ELSE
    -- Se não existe, cria novo
    INSERT INTO plans (name, price, product_limit)
    VALUES ('teste', 0.00, 5000);
    
    RAISE NOTICE 'Plano TESTE criado com sucesso! Limite: 5000 produtos';
  END IF;
  
  -- Mostra o plano atualizado
  RAISE NOTICE '==============================================';
END $$;

-- Mostra todos os planos para conferência
SELECT 
  id,
  name,
  price,
  COALESCE(product_limit, max_products, 0) as limite_produtos,
  created_at,
  updated_at
FROM plans
ORDER BY name;
