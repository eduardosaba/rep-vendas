-- Função SQL para contar produtos por usuário de forma otimizada
-- Evita buscar todos os registros no cliente

-- 1. Remover função se existir
DROP FUNCTION IF EXISTS count_products_by_user();

-- 2. Criar função otimizada
CREATE OR REPLACE FUNCTION count_products_by_user()
RETURNS TABLE (user_id uuid, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    user_id,
    COUNT(*) as count
  FROM products
  GROUP BY user_id;
$$;

-- 3. Comentário explicativo
COMMENT ON FUNCTION count_products_by_user() IS 
'Retorna contagem agregada de produtos por usuário. Usado na página Admin/Licenses para performance.';

-- 4. Verificar se funcionou
SELECT * FROM count_products_by_user() LIMIT 5;
