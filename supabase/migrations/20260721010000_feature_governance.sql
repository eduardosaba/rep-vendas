-- Migration: 20260721010000_feature_governance.sql
-- Description: Governança de Features (Feature Flags) por Organização para a transição SaaS Multi-Tenant.

CREATE TABLE IF NOT EXISTS public.organization_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(organization_id, feature_key)
);

ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Feature Governance" ON public.organization_features FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

CREATE POLICY "Tenant Feature Governance Admin" ON public.organization_features FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- Habilitar features iniciais para organizações existentes (MVP Setup)
INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'PICKING', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'OPERATIONAL_ANALYTICS', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'AUTO_INVOICE', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'FISCAL_ENGINE', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'SHIPPING', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled, activated_at)
SELECT id, 'TRACKING', true, now() FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;
