-- Migration: 20260719000000_order_workflow_governance.sql
-- Description: Segregates order status, introduces optimistic concurrency control (OCC), and provisions a clear event queue for notification hooks.

-- 1. Adequação Contábil e Eixos de Status na Capa do Pedido
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS commercial_status TEXT DEFAULT 'pending_approval' NOT NULL,
ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Limpeza de legados lógicos de constraints de status anteriores
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_status_enum;

-- Adição de travas estritas via CHECK Constraints (English Only Enums)
ALTER TABLE public.orders ADD CONSTRAINT chk_commercial_status_enum CHECK (
    commercial_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')
);

ALTER TABLE public.orders ADD CONSTRAINT chk_operational_status_enum CHECK (
    operational_status IN ('pending', 'picking', 'separated', 'invoiced', 'shipped', 'delivered', 'cancelled')
);

-- 2. Tabela Oficial de Eventos e Auditoria Rígida (order_events) preparada como Domain Events
CREATE TABLE public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    aggregate_type TEXT DEFAULT 'ORDER' NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    order_version INTEGER NOT NULL,
    
    -- Controle de fila para mensageria / Workers
    delivery_status TEXT DEFAULT 'PENDING' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_error TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_order_event_type_enum CHECK (
        event_type IN ('ORDER_CREATED', 'APPROVAL_REQUESTED', 'APPROVED', 'REJECTED', 'INVOICED', 'SHIPPED', 'DELIVERED', 'CANCELLED')
    ),
    CONSTRAINT chk_delivery_status_enum CHECK (
        delivery_status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'IGNORED')
    )
);

CREATE INDEX idx_order_events_delivery ON public.order_events(delivery_status) WHERE delivery_status IN ('PENDING', 'FAILED');
CREATE INDEX idx_order_events_parent_version ON public.order_events(order_id, order_version);

-- 3. RPC Transacional: Mudança de Estado com Controle de Concorrência Otimista (OCC)
CREATE OR REPLACE FUNCTION public.transition_order_state(
    p_order_id UUID,
    p_commercial_status TEXT,
    p_operational_status TEXT,
    p_expected_version INTEGER,
    p_actor_id UUID,
    p_event_type TEXT,
    p_reason TEXT,
    p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    -- A. Força o Lock de Linha (FOR UPDATE) e captura a versão corrente no milissegundo do disparo
    SELECT version INTO v_current_version 
    FROM public.orders 
    WHERE id = p_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND', 'message', 'Pedido não localizado.');
    END IF;

    -- B. Validação do Lock Otimista (OCC): Evita colisões de ações de diretores simultâneos
    IF v_current_version <> p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'VERSION_CONFLICT', 
            'message', 'Conflito de Concorrência: O pedido foi alterado por outro operador. Atualize a página e tente novamente.'
        );
    END IF;

    -- C. Executa a transição promovendo a versão do registro
    UPDATE public.orders
    SET 
        commercial_status = p_commercial_status,
        operational_status = p_operational_status,
        version = v_current_version + 1,
        rejection_reason = CASE WHEN p_event_type = 'REJECTED' THEN p_reason ELSE rejection_reason END,
        approved_by = CASE WHEN p_event_type = 'APPROVED' THEN p_actor_id ELSE approved_by END,
        approved_at = CASE WHEN p_event_type = 'APPROVED' THEN now() ELSE approved_at END,
        updated_at = now()
    WHERE id = p_order_id;

    -- D. Enfileira o log atômico na mesa de eventos para consumo assíncrono posterior (Domain Event)
    INSERT INTO public.order_events (
        order_id,
        aggregate_type,
        user_id,
        event_type,
        order_version,
        delivery_status,
        attempts,
        payload,
        created_at
    ) VALUES (
        p_order_id,
        'ORDER',
        p_actor_id,
        p_event_type,
        v_current_version + 1,
        'PENDING', -- Aguardando varredura do Notification Worker
        0,
        p_payload || jsonb_build_object('reason', COALESCE(p_reason, '')),
        now()
    );

    RETURN jsonb_build_object('success', true, 'new_version', v_current_version + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
