-- Migration: 20260720110000_picking_sessions.sql
-- Description: Criação da tabela de Picking Sessions e aprovação hierárquica de exceções logísticas.

-- 1. Picking Sessions (Sessão de trabalho para produtividade e rastreio)
CREATE TABLE IF NOT EXISTS public.picking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID REFERENCES public.pick_lists(id) ON DELETE CASCADE NOT NULL,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_picking_sessions_pick_list ON public.picking_sessions(pick_list_id);
CREATE INDEX IF NOT EXISTS idx_picking_sessions_operator ON public.picking_sessions(operator_id);

ALTER TABLE public.picking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Picking Sessions" ON public.picking_sessions FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- 2. Aprovação de Exceções Logísticas
ALTER TABLE public.pick_list_exceptions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD CONSTRAINT chk_pick_list_exception_status CHECK (status IN ('pending', 'approved', 'rejected'));
