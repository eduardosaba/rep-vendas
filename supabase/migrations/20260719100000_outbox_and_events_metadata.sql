-- Migration: 20260719100000_outbox_and_events_metadata.sql
-- Description: Evolves order_events into Domain Events and provisions the Transactional Outbox for notifications.

-- 1. Refatoração de order_events para Metadados de Auditoria Limpa
ALTER TABLE public.order_events 
DROP COLUMN IF EXISTS delivery_status,
DROP COLUMN IF EXISTS attempts,
DROP COLUMN IF EXISTS last_error,
DROP COLUMN IF EXISTS processed_at;

ALTER TABLE public.order_events
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS actor_name TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WEB',
ADD COLUMN IF NOT EXISTS correlation_id TEXT,
ADD COLUMN IF NOT EXISTS causation_id TEXT;

-- (aggregate_type já existe na migration 20260719000000, mas vamos reforçar caso não exista)
ALTER TABLE public.order_events
ADD COLUMN IF NOT EXISTS aggregate_type TEXT DEFAULT 'ORDER';

-- 2. Tabela de Transactional Outbox para notificações independentes
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.order_events(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL,
    provider TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    priority INTEGER DEFAULT 5 NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CONSTRAINT chk_notification_status_enum CHECK (
        status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'IGNORED')
    )
);

CREATE INDEX IF NOT EXISTS idx_outbox_processing ON public.notification_outbox(status, next_retry_at, priority DESC) WHERE status IN ('PENDING', 'FAILED');

-- 3. Habilita RLS de segurança e Políticas Básicas
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Política Multi-Tenant: Usuários enxergam a fila da sua empresa; Master enxerga tudo. (Worker com SECURITY DEFINER bypassa isso)
DROP POLICY IF EXISTS "Tenant Outbox Access" ON public.notification_outbox;
CREATE POLICY "Tenant Outbox Access"
ON public.notification_outbox FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.order_events oe
        JOIN public.orders o ON oe.order_id = o.id
        JOIN public.profiles p ON p.organization_id = o.organization_id
        WHERE oe.id = notification_outbox.event_id
        AND (
            p.id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles pm 
                WHERE pm.id = auth.uid() AND pm.role::text = 'master'
            )
        )
    )
);

-- 4. RPC para claim atômico via SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_pending_notifications(p_limit INTEGER)
RETURNS SETOF public.notification_outbox AS $$
BEGIN
    RETURN QUERY
    UPDATE public.notification_outbox
    SET status = 'PROCESSING',
        processed_at = now()
    WHERE id IN (
        SELECT id
        FROM public.notification_outbox
        WHERE status IN ('PENDING', 'FAILED')
          AND next_retry_at <= now()
        ORDER BY priority DESC, next_retry_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
