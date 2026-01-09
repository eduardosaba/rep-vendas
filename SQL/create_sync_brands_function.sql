-- Função RPC para sincronizar marcas dos produtos para a tabela brands
-- Esta função extrai todas as marcas únicas dos produtos do usuário
-- e as insere automaticamente na tabela brands

-- Remove a função antiga se existir (necessário para renomear parâmetro)
DROP FUNCTION IF EXISTS sync_brands(uuid);

CREATE OR REPLACE FUNCTION sync_brands(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    brand_name TEXT;
    inserted_count INTEGER := 0;
BEGIN
    -- Verifica se o usuário está autenticado
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Para cada marca única nos produtos do usuário
    FOR brand_name IN 
        SELECT DISTINCT brand 
        FROM products 
        WHERE user_id = p_user_id 
          AND brand IS NOT NULL 
          AND brand != ''
          AND TRIM(brand) != ''
    LOOP
        -- Inserir marca se não existir (ignora se já existe)
        INSERT INTO brands (name, user_id)
        VALUES (TRIM(brand_name), p_user_id)
        ON CONFLICT (user_id, name) DO NOTHING;
        
        -- Conta quantas foram inseridas (não conta duplicatas)
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
    END LOOP;

    -- Atualiza brand_id nos produtos que ainda não têm
    UPDATE products p
    SET brand_id = b.id
    FROM brands b
    WHERE p.user_id = p_user_id
      AND p.brand = b.name
      AND p.user_id = b.user_id
      AND p.brand_id IS NULL;
END;
$$;

-- Concede permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION sync_brands(UUID) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION sync_brands(UUID) IS 
'Sincroniza marcas únicas dos produtos do usuário para a tabela brands. 
Aceita p_user_id como parâmetro e valida se corresponde ao usuário autenticado.';
