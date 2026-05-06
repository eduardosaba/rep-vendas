-- Migration: Create notifications outbox + trigger for new orders
-- Filename: 20240520_create_notifications_outbox.sql

-- 1. (Opcional) Habilita gerador de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela Outbox para eventos de Webhook
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Função que registra o evento e emite NOTIFY
CREATE OR REPLACE FUNCTION public.handle_outbox_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.webhook_events (event_type, payload)
  VALUES (
    TG_ARGV[0], -- Passamos o tipo de evento como argumento no Trigger
    row_to_json(NEW)::jsonb
  );

  -- Emite um NOTIFY no canal Postgres (útil se você usar um listener)
  PERFORM pg_notify('outbox_event', TG_ARGV[0]);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger na tabela de pedidos (substitua pelo nome real da tabela se for diferente)
-- Aqui usamos `public.orders`, que é o nome usado no projeto.
DROP TRIGGER IF EXISTS tr_order_created_outbox ON public.orders;
CREATE TRIGGER tr_order_created_outbox
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_outbox_event('order.created');

-- - Se sua tabela de pedidos tiver outro nome, substitua a referência acima por esse nome.
-- - A Edge Function/Worker pode escutar o canal `outbox_event` ou consumir linhas da
--   tabela `public.webhook_events` onde processed = false e marcar processed = true
--   após o processamento bem-sucedido.
