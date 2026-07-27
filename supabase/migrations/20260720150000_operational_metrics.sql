-- Migration: 20260720150000_operational_metrics.sql
-- Description: Criação da camada de Operational Intelligence (Eventos e Views de KPIs Logísticos).

-- 1. SLA Operacional
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS target_pick_time_minutes INTEGER DEFAULT 45 NOT NULL;

-- 2. Tabela Base para Telemetria e IA (Operational Events)
CREATE TABLE IF NOT EXISTS public.operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    location_code TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_op_events_org ON public.operational_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_op_events_type ON public.operational_events(event_type);
CREATE INDEX IF NOT EXISTS idx_op_events_entity ON public.operational_events(entity_type, entity_id);

ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Operational Events" ON public.operational_events FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role::text = 'master')
);

-- 3. Views Padrão para KPIs Logísticos

-- A) View: operator_picking_metrics (Produtividade dos Operadores)
CREATE OR REPLACE VIEW public.operator_picking_metrics AS
SELECT 
    ps.operator_id,
    pr.full_name as operator_name,
    ps.organization_id,
    COUNT(DISTINCT ps.pick_list_id) as total_orders,
    COALESCE(AVG(EXTRACT(EPOCH FROM (ps.finished_at - ps.started_at))/60.0), 0) as average_picking_time_minutes,
    COUNT(CASE WHEN pl.status = 'COMPLETED' THEN 1 END) as completed_orders
FROM public.picking_sessions ps
JOIN public.pick_lists pl ON pl.id = ps.pick_list_id
JOIN public.profiles pr ON pr.id = ps.operator_id
WHERE ps.finished_at IS NOT NULL
GROUP BY ps.operator_id, pr.full_name, ps.organization_id;

-- B) View: organization_efficiency_metrics (Eficiência da Separação)
CREATE OR REPLACE VIEW public.organization_efficiency_metrics AS
SELECT 
    pl.organization_id,
    COUNT(DISTINCT pl.id) as total_pick_lists,
    SUM(pli.quantity_requested) as items_requested,
    SUM(pli.quantity_picked) as items_picked,
    COUNT(ple.id) as items_with_exceptions,
    CASE 
        WHEN SUM(pli.quantity_requested) > 0 THEN (SUM(pli.quantity_picked)::float / SUM(pli.quantity_requested)::float) * 100.0
        ELSE 0.0
    END as efficiency_percentage
FROM public.pick_lists pl
LEFT JOIN public.pick_list_items pli ON pli.pick_list_id = pl.id
LEFT JOIN public.pick_list_exceptions ple ON ple.pick_list_id = pl.id
GROUP BY pl.organization_id;

-- C) View: stock_exception_metrics (Rupturas e Avarias)
CREATE OR REPLACE VIEW public.stock_exception_metrics AS
SELECT 
    pl.organization_id,
    ple.product_id,
    prod.name as product_name,
    ple.type as exception_type,
    COUNT(ple.id) as occurrences
FROM public.pick_list_exceptions ple
JOIN public.pick_lists pl ON pl.id = ple.pick_list_id
JOIN public.products prod ON prod.id = ple.product_id
GROUP BY pl.organization_id, ple.product_id, prod.name, ple.type
ORDER BY occurrences DESC;

-- D) View: sla_metrics (SLA da Organização vs Realizado)
CREATE OR REPLACE VIEW public.sla_metrics AS
SELECT 
    oeff.organization_id,
    os.target_pick_time_minutes,
    COALESCE(AVG(opm.average_picking_time_minutes), 0) as organization_average_time,
    CASE 
        WHEN COALESCE(AVG(opm.average_picking_time_minutes), 0) = 0 THEN 100.0
        WHEN COALESCE(AVG(opm.average_picking_time_minutes), 0) <= os.target_pick_time_minutes THEN 100.0
        ELSE (os.target_pick_time_minutes::float / AVG(opm.average_picking_time_minutes)) * 100.0
    END as sla_compliance_percent
FROM public.organization_efficiency_metrics oeff
LEFT JOIN public.organization_settings os ON os.organization_id = oeff.organization_id
LEFT JOIN public.operator_picking_metrics opm ON opm.organization_id = oeff.organization_id
GROUP BY oeff.organization_id, os.target_pick_time_minutes;
