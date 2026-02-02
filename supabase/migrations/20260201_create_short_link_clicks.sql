-- Migration: create short_link_clicks
-- Records individual click events for short links (optional analytics)
-- Idempotent: safe to run multiple times

BEGIN;

-- Ensure extension for gen_random_uuid exists (Postgres/pgcrypto or pgcrypto provided by Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.short_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_link_id UUID NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_short_link_id ON public.short_link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_created_at ON public.short_link_clicks(created_at);

COMMENT ON TABLE public.short_link_clicks IS 'Eventos de clique para links curtos (armazenamento opcional para analytics)';

COMMIT;
