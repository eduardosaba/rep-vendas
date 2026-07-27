-- Migration: 20260718210000_checkout_and_conversion.sql
-- Description: Adds snapshot columns and atomic checkout RPC to convert Drafts into Orders.

-- 1. Altera a tabela orders para receber o snapshot financeiro do Draft
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source_draft_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS payment_method_id UUID,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS campaign_discount NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS rep_discount NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS tax_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS freight_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS margin_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'BRL' NOT NULL,
ADD COLUMN IF NOT EXISTS pricing_version VARCHAR(10) DEFAULT 'v1' NOT NULL,
ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 2. Altera a tabela order_items para receber o snapshot expandido do Produto
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS collection TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS supplier_sku TEXT,
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS cfop TEXT,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0 NOT NULL;

-- 3. Cria a função de checkout transacional (convert_draft_to_order)
CREATE OR REPLACE FUNCTION public.convert_draft_to_order(p_draft_id UUID, p_user_id UUID, p_payment_method_id UUID, p_notes TEXT)
RETURNS JSONB AS $$
DECLARE
    v_draft RECORD;
    v_item RECORD;
    v_order_id UUID;
    v_current_stock INTEGER;
    v_product_name TEXT;
    v_existing_order_id UUID;
BEGIN
    -- 0. Idempotência rígida baseada no source_draft_id
    SELECT id INTO v_existing_order_id 
    FROM public.orders 
    WHERE source_draft_id = p_draft_id;

    IF v_existing_order_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'order_id', v_existing_order_id, 'message', 'Draft was already converted.');
    END IF;

    -- 1. Lock rigoroso na capa do rascunho para impedir processamento concorrente
    SELECT * INTO v_draft 
    FROM public.draft_orders 
    WHERE id = p_draft_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rascunho de pré-venda não localizado.' USING ERRCODE = 'P1001';
    END IF;

    IF v_draft.status <> 'draft' THEN
        RAISE EXCEPTION 'Este rascunho já foi convertido ou cancelado.' USING ERRCODE = 'P1002';
    END IF;
    
    IF v_draft.customer_id IS NULL THEN
        RAISE EXCEPTION 'Cliente é obrigatório para converter a pré-venda.' USING ERRCODE = 'P1004';
    END IF;

    -- Verifica se o rascunho tem itens
    IF NOT EXISTS (SELECT 1 FROM public.draft_order_items WHERE draft_order_id = p_draft_id) THEN
        RAISE EXCEPTION 'Não é possível converter uma pré-venda sem itens.' USING ERRCODE = 'P1005';
    END IF;

    -- 2. Varredura e Lock de Estoque de TODOS os produtos contidos na pré-venda, com ORDENAÇÃO para evitar Deadlock
    FOR v_item IN 
        SELECT product_id, quantity 
        FROM public.draft_order_items 
        WHERE draft_order_id = p_draft_id
        ORDER BY product_id
    LOOP
        SELECT stock_quantity, name INTO v_current_stock, v_product_name
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_current_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para a armação: % (Disponível: %, Solicitado: %)', 
                v_product_name, v_current_stock, v_item.quantity 
                USING ERRCODE = 'P1003';
        END IF;
    END LOOP;

    -- 3. Baixa no inventário físico
    FOR v_item IN 
        SELECT product_id, quantity 
        FROM public.draft_order_items 
        WHERE draft_order_id = p_draft_id
        ORDER BY product_id
    LOOP
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = now()
        WHERE id = v_item.product_id;
    END LOOP;

    -- 4. Cria a Capa do Pedido Oficial
    INSERT INTO public.orders (
        source_draft_id,
        organization_id,
        client_id,
        company_id,
        user_id,
        status,
        total_value,
        payment_method_id,
        notes,
        item_count,
        subtotal,
        campaign_discount,
        rep_discount,
        discount_total,
        tax_value,
        freight_value,
        margin_value,
        margin_percent,
        grand_total,
        currency_code,
        pricing_version,
        pricing_snapshot,
        created_at,
        updated_at
    ) VALUES (
        p_draft_id,
        v_draft.organization_id,
        v_draft.customer_id,
        v_draft.company_id,
        v_draft.created_by,
        'pending',
        v_draft.grand_total,
        p_payment_method_id,
        COALESCE(p_notes, v_draft.notes),
        v_draft.total_items,
        v_draft.subtotal,
        v_draft.campaign_discount,
        v_draft.rep_discount,
        v_draft.discount_total,
        v_draft.tax_value,
        v_draft.freight_value,
        v_draft.margin_value,
        v_draft.margin_percent,
        v_draft.grand_total,
        v_draft.currency_code,
        v_draft.pricing_version,
        v_draft.metadata,
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- 5. Denormaliza itens do rascunho
    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        brand,
        product_name,
        product_reference,
        collection,
        category,
        color,
        size,
        barcode,
        supplier_sku,
        ncm,
        user_id,
        created_at,
        updated_at
    )
    SELECT 
        v_order_id,
        doi.product_id,
        doi.quantity,
        doi.unit_price,
        (doi.quantity * doi.unit_price),
        p.brand,
        p.name,
        p.reference_code,
        p.collection,
        p.category,
        p.color,
        p.size,
        p.barcode,
        p.supplier_sku,
        p.ncm,
        v_draft.created_by,
        now(),
        now()
    FROM public.draft_order_items doi
    JOIN public.products p ON p.id = doi.product_id
    WHERE doi.draft_order_id = p_draft_id;

    -- 6. Registra o movimento de estoque (SALE)
    INSERT INTO public.inventory_movements (
        product_id,
        organization_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
    )
    SELECT 
        product_id,
        v_draft.organization_id,
        'SALE',
        quantity,
        'ORDER',
        v_order_id,
        'Venda faturada (Pré-venda convertida)',
        v_draft.created_by
    FROM public.draft_order_items
    WHERE draft_order_id = p_draft_id;

    -- 7. Atualiza o status do rascunho
    UPDATE public.draft_orders
    SET status = 'converted',
        updated_at = now()
    WHERE id = p_draft_id;

    -- 8. Registra evento rígido em auditoria
    INSERT INTO public.draft_order_events (
        draft_order_id,
        user_id,
        event_type,
        payload,
        created_at
    ) VALUES (
        p_draft_id,
        p_user_id,
        'CONVERT_ORDER',
        jsonb_build_object('order_id', v_order_id, 'converted_at', now()),
        now()
    );

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
