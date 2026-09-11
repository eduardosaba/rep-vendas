-- ========================================================================================
-- SUPABASE MIGRATION: 20260801020000_orders_b2b_phase3.sql
-- DESCRIPTION: Fase 3 - Pedidos B2B com duplo status, OCC, histórico, snapshots
-- ========================================================================================

BEGIN;

-- ========================================================================================
-- 1. ORDERS - NOVAS COLUNAS B2B
-- ========================================================================================

-- Identidade organizacional (nullable para compatibilidade legado)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rep_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES public.organization_relationships(id) ON DELETE SET NULL;

-- Duplo status (comercial + operacional)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commercial_status TEXT DEFAULT 'draft' CHECK (commercial_status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled'
  )),
  ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'pending_fulfillment' CHECK (operational_status IN (
    'pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled'
  ));

-- OCC (Optimistic Concurrency Control)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Timestamps de transição
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_org ON public.orders(seller_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_org ON public.orders(buyer_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_rep_user ON public.orders(rep_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_commercial_status ON public.orders(commercial_status);
CREATE INDEX IF NOT EXISTS idx_orders_operational_status ON public.orders(operational_status);
CREATE INDEX IF NOT EXISTS idx_orders_relationship ON public.orders(relationship_id);

-- ========================================================================================
-- 2. ORDER_STATUS_HISTORY - HISTÓRICO IMUTÁVEL DE TRANSIÇÕES
-- ========================================================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status_domain TEXT NOT NULL CHECK (status_domain IN ('commercial', 'operational')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  order_version INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_user ON public.order_status_history(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_org ON public.order_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_domain ON public.order_status_history(status_domain);

-- RLS: Apenas usuários da organização podem ver o histórico
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order_History_Tenant_Access" ON public.order_status_history;
DROP POLICY IF EXISTS "Order_History_Master_Access" ON public.order_status_history;
DROP POLICY IF EXISTS "Order_History_Insert_Service" ON public.order_status_history;

-- Leitura: membership ativa OU master OU fallback legacy
CREATE POLICY "Order_History_Tenant_Access" ON public.order_status_history
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.user_id = auth.uid())
);

-- Inserção: apenas via service role (server-side) ou master
CREATE POLICY "Order_History_Insert_Service" ON public.order_status_history
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR current_setting('role') = 'service_role'
);

-- ========================================================================================
-- 3. ORDER_ITEMS - SNAPSHOTS COMERCIAIS
-- ========================================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS reference_code_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS brand_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS barcode_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS color_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS size_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS seller_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price_snapshot NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_snapshot NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_snapshot NUMERIC(10,2);

-- Índice
CREATE INDEX IF NOT EXISTS idx_order_items_seller_org ON public.order_items(seller_organization_id);

-- ========================================================================================
-- 4. RLS HÍBRIDA PARA ORDERS (ATUALIZAÇÃO)
-- ========================================================================================

-- Remove policies antigas se existirem
DROP POLICY IF EXISTS "Orders_Tenant_Access" ON public.orders;
DROP POLICY IF EXISTS "Orders_Master_Access" ON public.orders;
DROP POLICY IF EXISTS "Orders_Legacy_User_Access" ON public.orders;

-- Policy híbrida: membership ativa OU master OU fallback legacy
CREATE POLICY "Orders_Tenant_Access" ON public.orders
FOR SELECT USING (
  seller_organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR buyer_organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR rep_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = orders.company_id)
);

-- Inserção: membership ativa (owner/admin) OU master
CREATE POLICY "Orders_Insert_Tenant" ON public.orders
FOR INSERT WITH CHECK (
  seller_organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR user_id = auth.uid()
);

-- Atualização: OCC via version + membership OU master
CREATE POLICY "Orders_Update_Tenant" ON public.orders
FOR UPDATE USING (
  seller_organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR user_id = auth.uid()
) WITH CHECK (
  seller_organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR user_id = auth.uid()
);

COMMIT;