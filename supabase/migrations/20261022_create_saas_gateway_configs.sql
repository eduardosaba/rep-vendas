-- Migration: Criar tabela saas_gateway_configs para gerenciamento de gateways na Torre de Controle
-- Data: 2026-10-22
-- Projeto: RepVendas SaaS

BEGIN;

CREATE TABLE IF NOT EXISTS public.saas_gateway_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  active_provider TEXT NOT NULL DEFAULT 'asaas',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  
  -- Credenciais Asaas
  asaas_api_key TEXT,
  asaas_webhook_secret TEXT,
  
  -- Credenciais InfinitePay
  infinitepay_handle TEXT DEFAULT 'repvendas',
  infinitepay_api_key TEXT,
  
  -- Diagnóstico e Status
  is_configured BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Apenas Service Role e Master podem acessar
ALTER TABLE public.saas_gateway_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_gateway_configs_master_only" ON public.saas_gateway_configs;
CREATE POLICY "saas_gateway_configs_master_only"
ON public.saas_gateway_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master'
  )
);

-- Garante constraint única em subscriptions(user_id) caso a tabela exista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;
