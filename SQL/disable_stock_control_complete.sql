-- Atualiza configuração de estoque para todos os produtos
-- Alvo: desabilitar controle de estoque por padrão

BEGIN;

-- 1. Garante que track_stock seja false por padrão e atualiza valores existentes
ALTER TABLE products 
  ALTER COLUMN track_stock SET DEFAULT false;

UPDATE products 
SET track_stock = false 
WHERE track_stock IS DISTINCT FROM false;

-- 2. Se a coluna manage_stock existir na tabela products (como relatado), atualiza também
-- (Bloco dinâmico para evitar erro se a coluna não existir, embora o usuário afirme que existe)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'manage_stock') THEN
    EXECUTE 'ALTER TABLE products ALTER COLUMN manage_stock SET DEFAULT false';
    EXECUTE 'UPDATE products SET manage_stock = false WHERE manage_stock IS DISTINCT FROM false';
  END IF;
END $$;

COMMIT;
