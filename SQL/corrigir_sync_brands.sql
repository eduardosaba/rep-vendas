-- =====================================================
-- CORREÇÃO RÁPIDA: Função sync_brands
-- =====================================================
-- Este script corrige o erro "column p.brand_id does not exist"
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Remove a função antiga
DROP FUNCTION IF EXISTS sync_brands(uuid);

-- Recria a função CORRIGIDA (sem referência a brand_id)
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

    RAISE NOTICE 'Sincronização concluída com sucesso!';
END;
$$;

-- Concede permissão
GRANT EXECUTE ON FUNCTION sync_brands(UUID) TO authenticated;

-- Comentário
COMMENT ON FUNCTION sync_brands(UUID) IS 
'Sincroniza marcas únicas dos produtos do usuário para a tabela brands.';

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Função sync_brands corrigida com sucesso!';
    RAISE NOTICE 'O erro "brand_id does not exist" foi resolvido.';
    RAISE NOTICE '==============================================';
END $$;
