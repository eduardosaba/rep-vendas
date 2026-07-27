-- Migration: 20260718193000_create_draft_orders.sql
-- Description: Creates persistent draft order architecture for B2B cart states with scoped Multi-tenant RLS governance.

-- Função de Trigger genérica para updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create draft_orders parent table
CREATE TABLE public.draft_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- Maps to clients table containing B2B retail shops
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'converted', 'cancelled', 'expired')),
    notes TEXT,
    total_items INTEGER DEFAULT 0 NOT NULL,
    total_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Acopla o trigger para updated_at automático
CREATE TRIGGER set_draft_orders_updated_at
BEFORE UPDATE ON public.draft_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Garantir que exista apenas um draft ativo por usuário
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_draft_per_user 
ON public.draft_orders(created_by) 
WHERE status = 'draft';

-- Create draft_order_items child table
CREATE TABLE public.draft_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_order_id UUID REFERENCES public.draft_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT uq_draft_product UNIQUE (draft_order_id, product_id) -- Prevents duplicated rows for the same frame model
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_order_items ENABLE ROW LEVEL SECURITY;

-- Indexes for performance queries
CREATE INDEX idx_draft_orders_tenant ON public.draft_orders(organization_id);
CREATE INDEX idx_draft_orders_creator ON public.draft_orders(created_by);
CREATE INDEX idx_draft_order_items_parent ON public.draft_order_items(draft_order_id);
CREATE INDEX idx_draft_orders_status_creator ON public.draft_orders(status, created_by);

-- Drop old policies to ensure safe re-run capabilities
DROP POLICY IF EXISTS "Tenant Draft Orders Read Access" ON public.draft_orders;
DROP POLICY IF EXISTS "Tenant Draft Orders Modification Access" ON public.draft_orders;
DROP POLICY IF EXISTS "Tenant Draft Items Scoped Access" ON public.draft_order_items;

-- Policy 1: Managers and Creators can view drafts matching their organization scope
CREATE POLICY "Tenant Draft Orders Read Access"
ON public.draft_orders FOR SELECT
TO authenticated
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Policy 2: Creators or Managers can mutate drafts within their corporate scope
CREATE POLICY "Tenant Draft Orders Modification Access"
ON public.draft_orders FOR ALL
TO authenticated
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Policy 3: Chain-link access for items dependent on parent draft ownership permissions
CREATE POLICY "Tenant Draft Items Scoped Access"
ON public.draft_order_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.draft_orders
        WHERE draft_orders.id = draft_order_items.draft_order_id
        AND draft_orders.organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.draft_orders
        WHERE draft_orders.id = draft_order_items.draft_order_id
        AND draft_orders.organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
);

-- Função centralizada para recalcular totais de um draft
CREATE OR REPLACE FUNCTION public.recalculate_draft_totals(p_draft_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_items INTEGER;
  v_total_value NUMERIC(12,2);
BEGIN
  SELECT 
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(quantity * unit_price), 0)
  INTO 
    v_total_items, 
    v_total_value
  FROM public.draft_order_items
  WHERE draft_order_id = p_draft_id;

  UPDATE public.draft_orders
  SET 
    total_items = v_total_items,
    total_value = v_total_value
  WHERE id = p_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função transacional para adicionar ou incrementar item no draft
CREATE OR REPLACE FUNCTION public.add_item_to_draft(
  p_draft_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_unit_price NUMERIC(12,2);
  v_existing_item_id UUID;
BEGIN
  -- 1. Buscar o preço real do produto no lado do servidor
  SELECT price INTO v_unit_price
  FROM public.products
  WHERE id = p_product_id;

  IF v_unit_price IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado ou sem preço configurado.';
  END IF;

  -- 2. Verificar se o item já existe no rascunho
  SELECT id INTO v_existing_item_id
  FROM public.draft_order_items
  WHERE draft_order_id = p_draft_id AND product_id = p_product_id;

  IF v_existing_item_id IS NOT NULL THEN
    -- Incrementar a quantidade existente
    UPDATE public.draft_order_items
    SET quantity = quantity + p_quantity
    WHERE id = v_existing_item_id;
  ELSE
    -- Inserir novo item
    INSERT INTO public.draft_order_items (draft_order_id, product_id, quantity, unit_price)
    VALUES (p_draft_id, p_product_id, p_quantity, v_unit_price);
  END IF;

  -- 3. Recalcular os totais
  PERFORM public.recalculate_draft_totals(p_draft_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar a quantidade de um item
CREATE OR REPLACE FUNCTION public.update_item_quantity_in_draft(
  p_draft_id UUID,
  p_item_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  UPDATE public.draft_order_items
  SET quantity = p_quantity
  WHERE id = p_item_id AND draft_order_id = p_draft_id;

  PERFORM public.recalculate_draft_totals(p_draft_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover um item
CREATE OR REPLACE FUNCTION public.remove_item_from_draft(
  p_draft_id UUID,
  p_item_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.draft_order_items
  WHERE id = p_item_id AND draft_order_id = p_draft_id;

  PERFORM public.recalculate_draft_totals(p_draft_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

