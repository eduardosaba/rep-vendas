CREATE OR REPLACE FUNCTION public.process_order_billing(p_order_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order_status TEXT;
    v_order_org_id UUID;
    v_item RECORD;
    v_current_stock INTEGER;
    v_insufficient_product TEXT;
    v_inventory_exists BOOLEAN;
BEGIN
    -- 1. Bloqueia a linha do pedido e extrai o status atual e a organização (lendo company_id para compatibilidade)
    SELECT status, company_id INTO v_order_status, v_order_org_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não localizado no banco.');
    END IF;

    -- Garantia de estado: impede faturamento duplo
    IF v_order_status = 'Faturado' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este pedido já foi faturado anteriormente.');
    END IF;

    -- 2. Varre e valida o estoque de TODOS os itens antes de fazer qualquer alteração (Dry Run com LOCK ordenado)
    -- ORDER BY product_id previne deadlocks se dois pedidos tiverem os mesmos itens
    FOR v_item IN 
        SELECT product_id, quantity, product_name 
        FROM public.order_items 
        WHERE order_id = p_order_id
        ORDER BY product_id
    LOOP
        -- Se o item estiver linkado a um produto, verifica o saldo físico travando a linha
        IF v_item.product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_current_stock
            FROM public.products
            WHERE id = v_item.product_id
            FOR UPDATE;

            -- Se o saldo disponível for menor do que a quantidade pedida, aciona a falha controlada
            IF COALESCE(v_current_stock, 0) < v_item.quantity THEN
                v_insufficient_product := v_item.product_name || ' (Ref: ' || v_item.product_id || ')';
                RAISE EXCEPTION 'Estoque insuficiente para o produto: %', v_insufficient_product;
            END IF;
        END IF;
    END LOOP;

    -- Verifica se a tabela inventory_movements existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'inventory_movements'
    ) INTO v_inventory_exists;

    -- 3. Se passou na validação de todos os itens, executa a baixa física e registra a movimentação
    FOR v_item IN 
        SELECT product_id, quantity, product_name, product_reference 
        FROM public.order_items 
        WHERE order_id = p_order_id
        ORDER BY product_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            -- Deduz a quantidade diretamente da tabela de produtos
            UPDATE public.products
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.product_id;

            -- Registra o histórico na tabela de auditoria se ela estiver ativa (usando EXECUTE para evitar erro de compilação)
            IF v_inventory_exists THEN
                EXECUTE format('
                    INSERT INTO public.inventory_movements (
                        product_id, organization_id, performed_by, movement_type, quantity, reason, reference_id, created_at
                    ) VALUES (
                        $1, $2, $3, ''SALE'', $4, $5, $6, now()
                    )'
                ) USING 
                    v_item.product_id, 
                    v_order_org_id, 
                    p_user_id, 
                    -v_item.quantity,
                    'Baixa automatizada via faturamento do pedido #' || UPPER(SUBSTRING(p_order_id::text FROM 1 FOR 8)),
                    p_order_id;
            END IF;
        END IF;
    END LOOP;

    -- 4. Atualiza a capa do pedido para a esteira logística óptica
    UPDATE public.orders
    SET status = 'Faturado',
        faturado_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION
    WHEN OTHERS THEN
        -- Captura o erro (incluindo o estouro de estoque que disparamos no RAISE) e força o ROLLBACK completo automático
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
