-- Migration: 20260718200000_pricing_and_auditing.sql
-- Description: Promotes core commercial financials to native columns and establishes a strict event audit engine.

-- 1. Enriquecimento Contábil da Capa da Pré-venda
ALTER TABLE public.draft_orders
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
ADD COLUMN IF NOT EXISTS campaign_version VARCHAR(10) DEFAULT 'v1' NOT NULL,
ADD COLUMN IF NOT EXISTS tax_version VARCHAR(10) DEFAULT 'v1' NOT NULL,
ADD COLUMN IF NOT EXISTS discount_version VARCHAR(10) DEFAULT 'v1' NOT NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 2. Tabela Autônoma de Auditoria Transacional (Mesa de Eventos)
CREATE TABLE public.draft_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_order_id UUID REFERENCES public.draft_orders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER,
    discount_value NUMERIC(12,2),
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Validação de Enum de Eventos diretamente no Banco de Dados
    CONSTRAINT chk_draft_event_type CHECK (
        event_type IN (
            'ADD_ITEM', 'REMOVE_ITEM', 'UPDATE_QUANTITY', 'UPDATE_NOTES',
            'APPLY_CAMPAIGN', 'APPLY_DISCOUNT', 'RECALCULATE_PRICING',
            'CHECKOUT', 'SUBMIT', 'APPROVE', 'REJECT', 'CONVERT_ORDER'
        )
    )
);

-- 3. Índices de Otimização Operacional e RLS
CREATE INDEX idx_draft_events_parent_id ON public.draft_order_events(draft_order_id);
CREATE INDEX idx_draft_events_type ON public.draft_order_events(event_type);

ALTER TABLE public.draft_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Managers and Operators View Events"
ON public.draft_order_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.draft_orders
        WHERE draft_orders.id = draft_order_events.draft_order_id
        AND draft_orders.organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
);

-- 4. Função Transacional de Persistência Comercial
CREATE OR REPLACE FUNCTION public.persist_commercial_pricing(
  p_draft_id UUID,
  p_subtotal NUMERIC,
  p_campaign_discount NUMERIC,
  p_rep_discount NUMERIC,
  p_discount_total NUMERIC,
  p_tax_value NUMERIC,
  p_freight_value NUMERIC,
  p_margin_value NUMERIC,
  p_margin_percent NUMERIC,
  p_grand_total NUMERIC,
  p_user_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Atualiza o extrato contábil na capa
  UPDATE public.draft_orders
  SET 
    subtotal = p_subtotal,
    campaign_discount = p_campaign_discount,
    rep_discount = p_rep_discount,
    discount_total = p_discount_total,
    tax_value = p_tax_value,
    freight_value = p_freight_value,
    margin_value = p_margin_value,
    margin_percent = p_margin_percent,
    grand_total = p_grand_total,
    updated_at = NOW()
  WHERE id = p_draft_id;

  -- Registra a trilha de auditoria atrelada à mesma transação
  INSERT INTO public.draft_order_events (
    draft_order_id, user_id, event_type, payload
  ) VALUES (
    p_draft_id, p_user_id, p_event_type, p_payload
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
