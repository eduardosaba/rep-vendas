-- =====================================================
-- ENSURE_PLANS_AND_SUBSCRIPTIONS.sql
-- Idempotente: cria/atualiza tabelas `plans` e `subscriptions`, RLS e políticas
-- Execute no Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;

-- 1) TABELA: plans
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir coluna product_limit (compatibilidade com versões antigas)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS product_limit INTEGER NOT NULL DEFAULT 50;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_plans_updated_at ON public.plans;
CREATE TRIGGER trigger_update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plans_updated_at();

-- RLS: habilitar (seguindo princípio de mínimo privilégio)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública segura, escrita apenas via service role
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;
CREATE POLICY "Anyone can view plans" ON public.plans
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage plans" ON public.plans;
CREATE POLICY "Service role can manage plans" ON public.plans
  FOR ALL
  USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plans_price ON public.plans(price);
CREATE INDEX IF NOT EXISTS idx_plans_name ON public.plans(LOWER(name));

-- Inserir planos padrão (idempotente)
INSERT INTO public.plans (id, name, price, product_limit)
SELECT gen_random_uuid(), 'Básico', 29.90, 50
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Básico');

INSERT INTO public.plans (id, name, price, product_limit)
SELECT gen_random_uuid(), 'Profissional', 49.90, 200
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Profissional');

INSERT INTO public.plans (id, name, price, product_limit)
SELECT gen_random_uuid(), 'Premium', 99.90, 1000
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Premium');

-- 2) TABELA: subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Trigger updated_at for subscriptions
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- Habilitar RLS em subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas seguras
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL
  USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

COMMIT;

-- =====================================================
-- SUGESTÃO DE TESTES (execute em SQL Editor ou via psql):
-- 1) Verificar tabelas e colunas
--    SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('plans','subscriptions');
--
-- 2) Testar leitura pública de planos (como anon)
--    SET ROLE anon; SELECT name, price FROM public.plans LIMIT 5; RESET ROLE;
--
-- 3) Testar acesso restrito a subscriptions
--    SET ROLE anon; SELECT * FROM public.subscriptions LIMIT 5; RESET ROLE; -- deve retornar 0 rows
--
-- =====================================================
