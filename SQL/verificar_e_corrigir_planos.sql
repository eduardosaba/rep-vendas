-- =====================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO DE PLANOS
-- =====================================================
-- Este script verifica e corrige:
-- 1. Estrutura da tabela plans (product_limit vs max_products)
-- 2. Dados dos planos (incluindo o plano 'teste' com 5000 produtos)
-- 3. Constraints na tabela products que podem estar bloqueando importação
-- =====================================================

BEGIN;

-- ============== 1. VERIFICAR E PADRONIZAR COLUNA DE LIMITE ==============
-- Adiciona product_limit se não existir
ALTER TABLE plans ADD COLUMN IF NOT EXISTS product_limit INTEGER;

-- Se max_products existir e product_limit não tiver valor, copia
UPDATE plans 
SET product_limit = max_products 
WHERE product_limit IS NULL 
  AND max_products IS NOT NULL;

-- Define valor padrão se ambas estiverem nulas
UPDATE plans 
SET product_limit = 500 
WHERE product_limit IS NULL;

-- ============== 2. ADICIONAR PLANO TESTE COM 5000 PRODUTOS ==============
-- Insere ou atualiza o plano 'teste' (sem precisar de constraint UNIQUE)
DO $$
BEGIN
  -- Se já existe, atualiza
  IF EXISTS (SELECT 1 FROM plans WHERE LOWER(name) = 'teste') THEN
    UPDATE plans 
    SET product_limit = 5000,
        updated_at = NOW()
    WHERE LOWER(name) = 'teste';
    RAISE NOTICE 'Plano TESTE atualizado para 5000 produtos';
  ELSE
    -- Se não existe, cria
    INSERT INTO plans (name, price, product_limit)
    VALUES ('teste', 0.00, 5000);
    RAISE NOTICE 'Plano TESTE criado com 5000 produtos';
  END IF;
END $$;

-- ============== 3. VERIFICAR CONSTRAINTS NA TABELA PRODUCTS ==============
-- Mostra todas as constraints UNIQUE na tabela products
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_name = 'products';

-- ============== 4. REMOVER CONSTRAINT QUE IMPEDE DUPLICATAS ==============
-- Se existe constraint UNIQUE em (user_id, reference_code), remove
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Procura constraint UNIQUE que combine user_id e reference_code
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name = 'products'
    AND tc.constraint_name IN (
      SELECT kcu2.constraint_name 
      FROM information_schema.key_column_usage kcu2
      WHERE kcu2.table_name = 'products' 
        AND kcu2.column_name IN ('user_id', 'reference_code')
      GROUP BY kcu2.constraint_name 
      HAVING COUNT(*) = 2
    )
  LIMIT 1;

  -- Se encontrou, remove
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE products DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    RAISE NOTICE 'Constraint % removida', v_constraint_name;
  ELSE
    RAISE NOTICE 'Nenhuma constraint UNIQUE em (user_id, reference_code) encontrada';
  END IF;
END $$;

-- ============== 5. VERIFICAÇÃO FINAL ==============
-- Mostra todos os planos cadastrados
SELECT 
  id,
  name,
  price,
  product_limit,
  max_products,
  created_at
FROM plans
ORDER BY product_limit ASC;

-- Conta produtos por usuário (para verificar se há mais de 1000)
SELECT 
  user_id,
  COUNT(*) as total_produtos
FROM products
GROUP BY user_id
HAVING COUNT(*) > 900  -- Mostra usuários com mais de 900 produtos
ORDER BY total_produtos DESC;

COMMIT;

-- ============== MENSAGEM FINAL ==============
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CORREÇÃO CONCLUÍDA!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Verifique os resultados acima.';
  RAISE NOTICE 'O plano TESTE deve aparecer com 5000 produtos.';
  RAISE NOTICE '==============================================';
END $$;
