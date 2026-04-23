-- Migration consolidada: configurações globais e suporte a Distribuidoras (Multitenancy)
BEGIN;

-- 1) Corrige o erro de log criando plan_feature_matrix em global_configs
ALTER TABLE public.global_configs
  ADD COLUMN IF NOT EXISTS plan_feature_matrix JSONB DEFAULT '{
    "individual": {"max_reps": 1, "custom_slug": true, "price_lock": true},
    "distribuidora_small": {"max_reps": 10, "custom_slug": true, "price_lock": true},
    "distribuidora_pro": {"max_reps": 50, "custom_slug": true, "price_lock": true}
  }';

-- 2) Estrutura para a Torre de Controle (SaaS): role/status/trial/company
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT null;

-- 3) Preferências e métricas
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS price_unlock_mode TEXT DEFAULT 'none';

ALTER TABLE public.public_catalogs
  ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;

-- 4) Segurança: garantir default para store_name (prevenção de 500)
ALTER TABLE public.public_catalogs
  ALTER COLUMN store_name SET DEFAULT 'Minha Loja';

COMMIT;

-- Nota: execute estas migrations primeiro em staging. Faça backup antes de aplicar em produção.
-- Após aplicar, reinicie/redeploy do serviço PostgREST/Supabase para atualizar o cache do schema.
