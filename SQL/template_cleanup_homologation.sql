-- Script de Limpeza e Homologação do Usuário Template
-- Executa automaticamente buscando o usuário com role='template'

DO $$ 
DECLARE 
    v_template_id UUID;
    v_deleted_inactive INTEGER;
    v_deleted_invalid INTEGER;
BEGIN
    -- Busca automaticamente o usuário template
    SELECT id INTO v_template_id 
    FROM public.profiles 
    WHERE role = 'template' 
    LIMIT 1;

    -- Valida se encontrou
    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário com role=template encontrado. Crie um template primeiro.';
    END IF;

    RAISE NOTICE '=== INICIANDO LIMPEZA DO TEMPLATE ===';
    RAISE NOTICE 'Template ID: %', v_template_id;

    -- 1. LIMPEZA: Remove produtos que foram desativados (lixo de teste)
    DELETE FROM public.products 
    WHERE user_id = v_template_id AND is_active = false;
    GET DIAGNOSTICS v_deleted_inactive = ROW_COUNT;
    RAISE NOTICE '✓ Removidos % produtos inativos', v_deleted_inactive;

    -- 2. INTEGRIDADE: Remove itens sem código de referência (inválidos para clonagem)
    DELETE FROM public.products 
    WHERE user_id = v_template_id 
      AND (reference_code IS NULL OR reference_code = '');
    GET DIAGNOSTICS v_deleted_invalid = ROW_COUNT;
    RAISE NOTICE '✓ Removidos % produtos sem reference_code', v_deleted_invalid;

    -- 3. PADRONIZAÇÃO: Garante que o Template NÃO tenha original_product_id 
    -- (Ele é a fonte, não pode ser clone de ninguém)
    UPDATE public.products 
    SET original_product_id = NULL 
    WHERE user_id = v_template_id
      AND original_product_id IS NOT NULL;

    -- 4. HOMOLOGAÇÃO: Ativa o selo de fonte confiável
    UPDATE public.profiles 
    SET can_be_clone_source = true,
        role = 'template'
    WHERE id = v_template_id;

    RAISE NOTICE '=== LIMPEZA CONCLUÍDA ===';
    RAISE NOTICE 'Produtos removidos: % (total)', v_deleted_inactive + v_deleted_invalid;
    
    -- 5. RELATÓRIO: Mostra estatísticas do template limpo
    RAISE NOTICE '';
    RAISE NOTICE '=== RELATÓRIO FINAL ===';
    
    -- Contagem de produtos ativos
    DECLARE
        v_total_products INTEGER;
        v_products_with_image INTEGER;
        v_brands_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_total_products 
        FROM public.products 
        WHERE user_id = v_template_id AND (is_active IS DISTINCT FROM FALSE);
        
        SELECT COUNT(*) INTO v_products_with_image 
        FROM public.products 
        WHERE user_id = v_template_id 
          AND (is_active IS DISTINCT FROM FALSE)
          AND (image_url IS NOT NULL OR image_path IS NOT NULL);
        
        SELECT COUNT(DISTINCT brand) INTO v_brands_count 
        FROM public.products 
        WHERE user_id = v_template_id AND (is_active IS DISTINCT FROM FALSE);
        
        RAISE NOTICE 'Total de produtos ativos: %', v_total_products;
        RAISE NOTICE 'Produtos com imagem: %', v_products_with_image;
        RAISE NOTICE 'Marcas distintas: %', v_brands_count;
    END;

END $$;
