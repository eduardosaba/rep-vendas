-- Migration: Adicionar tabela de fila de webhooks
-- Necessária para rastrear e reprocessar webhooks com falha

BEGIN;

-- 1) Tabela webhook_queue para rastrear webhooks processados/falhados
CREATE TABLE IF NOT EXISTS public.webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- "mercadopago", "stripe", etc
  provider_payment_id TEXT NOT NULL, -- payment_id do MP
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  error_message TEXT,
  raw_payload JSONB, -- Payload original para debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_provider_payment UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON public.webhook_queue (status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_next_retry ON public.webhook_queue (next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_provider ON public.webhook_queue (provider);

-- 2) Tabela webhook_signatures para rastrear x-signature recebidas
-- Previne replay attacks (mesmo webhook processado 2x)
CREATE TABLE IF NOT EXISTS public.webhook_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  x_signature TEXT UNIQUE NOT NULL,
  provider_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Limpar após 24h (via job Inngest)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_webhook_signatures_x_sig ON public.webhook_signatures (x_signature);
CREATE INDEX IF NOT EXISTS idx_webhook_signatures_expires ON public.webhook_signatures (expires_at);

-- 3) RLS Policies (apenas Service Role acessa)
ALTER TABLE public.webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_signatures ENABLE ROW LEVEL SECURITY;

-- Service Role pode fazer tudo
CREATE POLICY "service_role_access_webhook_queue"
ON public.webhook_queue FOR ALL
USING (true); -- Service Role ignora isso

CREATE POLICY "service_role_access_webhook_signatures"
ON public.webhook_signatures FOR ALL
USING (true); -- Service Role ignora isso

COMMIT;

-- Nota: Execute com Service Role Key
