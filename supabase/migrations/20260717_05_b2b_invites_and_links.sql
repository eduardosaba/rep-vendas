-- ========================================================================================
-- SUPABASE MIGRATION: 20260717_05_b2b_invites_and_links.sql
-- DESCRIPTION: Controle de convites de equipe para a Distribuidora (Multi-tenant)
-- ========================================================================================

BEGIN;

-- 1. Tabela de convites de equipe
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user', -- Deve respeitar a constraint profiles_role_check ('user', 'pdv', etc.)
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT invite_role_check CHECK (role IN ('pdv', 'gerente', 'compras', 'admin', 'master', 'fabrica', 'operador', 'user'))
);

-- Index de busca rápida de tokens
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON public.organization_invites(token);

COMMIT;
