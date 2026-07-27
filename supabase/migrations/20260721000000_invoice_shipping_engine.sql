-- Migration: 20260721000000_invoice_shipping_engine.sql
-- Description: Adiciona o motor de faturamento (Invoice) e expedição (Shipment).

-- 1. Snapshot e Status Fiscal na Tabela de Faturas (invoices)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'WAITING_PROVIDER' NOT NULL,
ADD COLUMN IF NOT EXISTS customer_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS items_snapshot JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS totals_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS fiscal_provider TEXT,
ADD COLUMN IF NOT EXISTS provider_response JSONB;

-- 2. Entidade Transportadoras (carriers)
CREATE TABLE IF NOT EXISTS public.carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    tracking_url_pattern TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Carriers" ON public.carriers FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- 3. Melhorias na Tabela de Expedição (shipments)
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.carriers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
