-- Função RPC para sincronizar categorias dos produtos para a tabela categories
-- Esta função extrai todas as categorias únicas dos produtos do usuário
-- e as insere automaticamente na tabela categories

-- Remove a função antiga se existir (necessário para renomear parâmetro)
DROP FUNCTION IF EXISTS sync_categories(uuid);

CREATE OR REPLACE FUNCTION sync_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    category_name TEXT;
    inserted_count INTEGER := 0;
BEGIN
    -- Verifica se o usuário está autenticado
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Para cada categoria única nos produtos do usuário
    FOR category_name IN 
        SELECT DISTINCT category 
        FROM products 
        WHERE user_id = p_user_id 
          AND category IS NOT NULL 
          AND category != ''
          AND TRIM(category) != ''
    LOOP
        -- Inserir categoria se não existir (ignora se já existe)
        INSERT INTO categories (name, user_id)
        VALUES (TRIM(category_name), p_user_id)
        ON CONFLICT (user_id, name) DO NOTHING;
        
        -- Conta quantas foram inseridas (não conta duplicatas)
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
    END LOOP;

    -- Atualiza category_id nos produtos que ainda não têm
    UPDATE products p
    SET category_id = c.id
    FROM categories c
    WHERE p.user_id = p_user_id
      AND p.category = c.name
      AND p.user_id = c.user_id
      AND p.category_id IS NULL;
END;
$$;

-- Concede permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION sync_categories(UUID) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION sync_categories(UUID) IS 
'Sincroniza categorias únicas dos produtos do usuário para a tabela categories. 
Aceita p_user_id como parâmetro e valida se corresponde ao usuário autenticado.';
