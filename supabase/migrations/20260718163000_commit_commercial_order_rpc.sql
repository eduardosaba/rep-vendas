-- Adiciona a chave de idempotência para evitar duplicidade de requisições
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Garante a unicidade e o índice para alta performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'uq_orders_idempotency' AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT uq_orders_idempotency UNIQUE (idempotency_key);
    END IF;
END $$;


CREATE OR REPLACE FUNCTION public.commit_commercial_order(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_header JSONB;
    v_items JSONB;
    v_item JSONB;
    v_sum_items NUMERIC(10,2) := 0;
    v_header_total NUMERIC(10,2);
    v_existing_order UUID;
    v_idem_key TEXT;
    
    v_pname TEXT;
    v_pref TEXT;
    v_pbrand TEXT;
    
    v_product_id UUID;
    v_qty INTEGER;
    v_uprice NUMERIC(10,2);
    v_tprice NUMERIC(10,2);
BEGIN
    v_header := p_payload -> 'header';
    v_items := p_payload -> 'items';

    -- 1. Validação Estrutural Inicial
    IF v_header IS NULL OR v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'Payload inválido. Cabeçalho ou itens ausentes.' USING ERRCODE = 'P0001';
    END IF;

    IF (v_header ->> 'client_id') IS NULL THEN
        RAISE EXCEPTION 'client_id é obrigatório.' USING ERRCODE = 'P0002';
    END IF;

    IF (v_header ->> 'company_id') IS NULL THEN
        RAISE EXCEPTION 'company_id é obrigatório.' USING ERRCODE = 'P0003';
    END IF;

    v_header_total := (v_header ->> 'total_value')::NUMERIC(10,2);
    IF v_header_total <= 0 THEN
        RAISE EXCEPTION 'O valor total do pedido deve ser maior que zero.' USING ERRCODE = 'P0004';
    END IF;

    -- 2. Idempotência: Evitar duplicação
    v_idem_key := v_header ->> 'idempotency_key';
    IF v_idem_key IS NOT NULL THEN
        SELECT id INTO v_existing_order FROM public.orders WHERE idempotency_key = v_idem_key LIMIT 1;
        IF v_existing_order IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_existing_order, 'message', 'Pedido já havia sido criado com esta chave.');
        END IF;
    END IF;

    -- 3. Validação Matemática Estrita Item por Item
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item ->> 'product_id')::UUID;
        v_qty := (v_item ->> 'quantity')::INTEGER;
        v_uprice := (v_item ->> 'unit_price')::NUMERIC(10,2);
        v_tprice := (v_item ->> 'total_price')::NUMERIC(10,2);

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'A quantidade do produto % deve ser maior que zero.', v_product_id USING ERRCODE = 'P0005';
        END IF;

        IF v_uprice < 0 THEN
            RAISE EXCEPTION 'O preço unitário do produto % não pode ser negativo.', v_product_id USING ERRCODE = 'P0006';
        END IF;

        IF ROUND(v_qty * v_uprice, 2) <> ROUND(v_tprice, 2) THEN
            RAISE EXCEPTION 'Divergência matemática no produto %: Informado %, Calculado %', 
                v_product_id, v_tprice, ROUND(v_qty * v_uprice, 2) USING ERRCODE = 'P0007';
        END IF;

        v_sum_items := v_sum_items + v_tprice;
    END LOOP;

    -- Validação Cruzada: Soma dos itens vs Valor do Cabeçalho
    IF ROUND(v_sum_items, 2) <> ROUND(v_header_total, 2) THEN
        RAISE EXCEPTION 'Inconsistência financeira: O total do cabeçalho (%) difere da soma dos itens (%)', 
            v_header_total, v_sum_items USING ERRCODE = 'P0008';
    END IF;

    -- 4. Inserção da Capa (Falha na constraint UNIQUE cai como exceção e faz rollback de tudo, retornando erro)
    INSERT INTO public.orders (
        client_id,
        company_id,
        user_id,
        status,
        total_value,
        payment_method,
        notes,
        idempotency_key,
        created_at,
        updated_at
    ) VALUES (
        (v_header ->> 'client_id')::UUID,
        (v_header ->> 'company_id')::UUID,
        (v_header ->> 'user_id')::UUID,
        v_header ->> 'status',
        v_header_total,
        COALESCE(v_header ->> 'payment_method', 'boleto'),
        v_header ->> 'notes',
        v_idem_key,
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- 5. Inserção dos Itens e Denormalização
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item ->> 'product_id')::UUID;
        
        -- Busca com STRICT: se não achar, joga exceção e faz rollback de tudo
        SELECT name, reference_code, brand 
        INTO STRICT v_pname, v_pref, v_pbrand
        FROM public.products
        WHERE id = v_product_id;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            brand,
            product_name,
            product_reference,
            user_id,
            created_at,
            updated_at
        ) VALUES (
            v_order_id,
            v_product_id,
            (v_item ->> 'quantity')::INTEGER,
            (v_item ->> 'unit_price')::NUMERIC(10,2),
            (v_item ->> 'total_price')::NUMERIC(10,2),
            v_pbrand,
            v_pname,
            v_pref,
            (v_header ->> 'user_id')::UUID,
            now(),
            now()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);

    -- Não capturamos WHEN OTHERS THEN. Exceções subirão para a aplicação, 
    -- o Postgres faz ROLLBACK automático e o Node trata o erro.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
