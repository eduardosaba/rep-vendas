-- Migration: Criar tabela payment_gateways para armazenar credenciais de gateway de forma segura
-- Data: 2026-06-20
BEGIN;

-- 1) Criar tabela payment_gateways (com referência a companies ou user_id, dependendo do tenant)
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'pagarme')),
  api_key_encrypted TEXT, -- Será armazenado no Supabase Vault
  webhook_secret_encrypted TEXT, -- Webhook secret também vai para o Vault
  is_active BOOLEAN DEFAULT true,
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}', -- Para armazenar shop_id do MP, etc
  
  -- Constraint: cada empresa tem apenas um provider ativo por vez
  CONSTRAINT unique_active_gateway_per_company UNIQUE (company_id, provider) WHERE is_active = true,
  CONSTRAINT unique_active_gateway_per_user UNIQUE (user_id, provider) WHERE is_active = true
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_company ON public.payment_gateways (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_user ON public.payment_gateways (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON public.payment_gateways (is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON public.payment_gateways (provider);

-- 2) Criar tabela payment_transactions para rastrear transações
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, failed, refunded, cancelled
  payment_method TEXT, -- credit_card, pix, boleto, etc
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON public.payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON public.payment_transactions (gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_id ON public.payment_transactions (provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON public.payment_transactions (created_at);

-- 3) Habilitar Vault extension (se não estiver habilitada)
-- Nota: Execute isso manualmente no Supabase Dashboard caso precise
-- CREATE EXTENSION IF NOT EXISTS pgsodium SCHEMA pgsodium;

-- 4) RLS Policies para payment_gateways
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver seu próprio gateway (scoped por user_id ou company_id)
CREATE POLICY "users_can_view_their_gateways"
ON public.payment_gateways FOR SELECT
USING (
  auth.uid() = user_id OR 
  (company_id IS NOT NULL AND company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.profiles p ON p.company_id = c.id
    WHERE p.id = auth.uid()
  ))
);

-- Política: Usuário pode inserir seu próprio gateway
CREATE POLICY "users_can_create_gateways"
ON public.payment_gateways FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  (company_id IS NOT NULL AND company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.profiles p ON p.company_id = c.id
    WHERE p.id = auth.uid()
  ))
);

-- Política: Usuário pode atualizar seu próprio gateway
CREATE POLICY "users_can_update_gateways"
ON public.payment_gateways FOR UPDATE
USING (
  auth.uid() = user_id OR 
  (company_id IS NOT NULL AND company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.profiles p ON p.company_id = c.id
    WHERE p.id = auth.uid()
  ))
);

-- 5) RLS Policies para payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver transações dos seus pedidos
CREATE POLICY "users_can_view_transactions"
ON public.payment_transactions FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders o
    WHERE o.user_id = auth.uid()
  )
);

-- Política: Sistema pode inserir transações (via Service Role)
CREATE POLICY "service_can_insert_transactions"
ON public.payment_transactions FOR INSERT
WITH CHECK (true); -- Service Role pode fazer INSERT sem restrição

-- Política: Sistema pode atualizar transações
CREATE POLICY "service_can_update_transactions"
ON public.payment_transactions FOR UPDATE
USING (true); -- Service Role pode fazer UPDATE sem restrição

COMMIT;

-- Nota: Execute com Service Role Key em produção
