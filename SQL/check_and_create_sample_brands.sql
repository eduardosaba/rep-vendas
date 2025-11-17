-- Script simples para verificar e criar marcas de exemplo
-- Execute este script no SQL Editor do Supabase

DO $$
DECLARE
    my_user_id UUID;
    user_id_string TEXT;
    brand_count INTEGER;
BEGIN
    -- ============ CONFIGURAÇÃO: SUBSTITUA PELO SEU USER_ID ============
    -- Execute primeiro: SELECT id, email FROM auth.users;
    -- Depois copie o ID aqui:
    user_id_string := 'fe7ea2fc-afd4-4310-a080-266fca8186a7';  -- ← SUBSTITUA ESTE VALOR!

    -- Converter para UUID após validação
    BEGIN
        my_user_id := user_id_string::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO: O UUID fornecido "%" não é válido. Deve ter 36 caracteres no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.', user_id_string;
    END;

    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = my_user_id) THEN
        RAISE EXCEPTION 'ERRO: Usuário com ID % não encontrado. Verifique o ID na tabela auth.users.', my_user_id;
    END IF;

    -- Verificar se a tabela brands existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE EXCEPTION 'ERRO: Tabela brands não existe. Execute primeiro o script create_brands_table.sql';
    END IF;

    RAISE NOTICE 'Verificando marcas existentes para o usuário: %', my_user_id;

    -- Contar marcas existentes
    SELECT COUNT(*) INTO brand_count FROM brands WHERE user_id = my_user_id;

    IF brand_count = 0 THEN
        RAISE NOTICE 'Nenhuma marca encontrada. Inserindo marcas de exemplo...';

        -- Inserir marcas de exemplo
        INSERT INTO brands (name, commission_percentage, user_id) VALUES
        ('Samsung', 5.0, my_user_id),
        ('Apple', 8.0, my_user_id),
        ('LG', 6.0, my_user_id),
        ('Sony', 7.0, my_user_id),
        ('Dell', 4.0, my_user_id),
        ('Nike', 10.0, my_user_id),
        ('Adidas', 9.0, my_user_id),
        ('Electrolux', 3.0, my_user_id);

        RAISE NOTICE '8 marcas de exemplo inseridas com sucesso!';
    ELSE
        RAISE NOTICE 'Já existem % marcas cadastradas para este usuário.', brand_count;
    END IF;

    -- Mostrar resumo final
    SELECT COUNT(*) INTO brand_count FROM brands WHERE user_id = my_user_id;
    RAISE NOTICE 'Total de marcas para este usuário: %', brand_count;

END $$;