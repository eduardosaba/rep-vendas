-- Migration: 20260720100000_fulfillment_hardening.sql
-- Description: Hardening do módulo de Fulfillment (Organization Settings, Locks de separação e Snapshot de código de barras).

-- 1. Organization Settings (Configurações flexíveis por distribuidora/loja)
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
    blind_picking_enabled BOOLEAN DEFAULT true NOT NULL,
    require_barcode_scan BOOLEAN DEFAULT false NOT NULL,
    allow_manual_quantity BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Organization Settings" ON public.organization_settings FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- 2. Lock de Operação Simultânea em Pick Lists
ALTER TABLE public.pick_lists 
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- 3. Previsão de Leitor de Código de Barras
ALTER TABLE public.pick_list_items
ADD COLUMN IF NOT EXISTS barcode_snapshot TEXT;
