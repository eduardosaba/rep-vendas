-- Migration: 20260911000000_onboarding_phase2_additive.sql
-- Description: Suporte aditivo ao onboarding em 4 etapas e proteção dos usuários legados existentes.

BEGIN;

-- =========================================================
-- 1. CONTROLE DO ONBOARDING
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Garantir faixa válida das etapas (1 a 4).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_onboarding_step;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_onboarding_step
  CHECK (onboarding_step BETWEEN 1 AND 4);


-- =========================================================
-- 2. BACKFILL DE USUÁRIOS LEGADOS
-- =========================================================
--
-- IMPORTANTE:
-- Usar uma data/hora FIXA correspondente ao início oficial do novo onboarding.
-- Isso torna a migration determinística e impede que uma eventual
-- reexecução considere usuários novos como legados.

UPDATE public.profiles AS p
SET
  onboarding_completed = true,
  onboarding_step = 4
WHERE p.onboarding_completed IS NOT TRUE
AND (
  p.organization_id IS NOT NULL

  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = p.id
  )

  OR EXISTS (
    SELECT 1
    FROM public.settings s
    WHERE s.user_id = p.id
  )

  OR EXISTS (
    SELECT 1
    FROM public.public_catalogs pc
    WHERE pc.user_id = p.id
  )

  OR EXISTS (
    SELECT 1
    FROM public.products pr
    WHERE pr.user_id = p.id
  )

  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.user_id = p.id
  )

  OR EXISTS (
    SELECT 1
    FROM public.draft_orders d
    WHERE d.created_by = p.id
  )

  OR p.role::text IN (
    'master',
    'admin',
    'company_admin',
    'distributor_operator',
    'admin_company'
  )

  -- Rede de segurança para TODAS as contas que já existiam
  -- antes da entrada em produção do novo onboarding.
  OR p.created_at < TIMESTAMPTZ '2026-09-11 08:00:00-03'
);


-- =========================================================
-- 3. NORMALIZAÇÃO
-- =========================================================

-- Se algum perfil já tinha onboarding_completed = true,
-- garantir coerência da etapa.
UPDATE public.profiles
SET onboarding_step = 4
WHERE onboarding_completed IS TRUE
  AND onboarding_step IS DISTINCT FROM 4;

-- Não preencher onboarding_completed_at para contas legadas.
-- Essa data será preenchida somente quando um usuário realmente
-- concluir o novo onboarding.

COMMIT;
