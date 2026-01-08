-- Migration: criar tabela de fonts, audit_logs e aplicar RLS/policies
-- Data: 2025-12-27

-- 1) Adicionar colunas para suportar font_url (se ainda não existirem)
ALTER TABLE IF EXISTS public_catalogs ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS platform_settings ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS global_configs ADD COLUMN IF NOT EXISTS font_url TEXT DEFAULT NULL;

-- 2) Tabela para registrar uploads/metadata de fontes
CREATE TABLE IF NOT EXISTS public.fonts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  format text,
  size int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fonts_user_id ON public.fonts(user_id);

-- 3) Tabela de auditoria (registra decisões/ações relacionadas a fontes)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  attempted_font text,
  final_font text,
  allowed boolean,
  reason text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 4) Habilitar Row Level Security na tabela `fonts` e criar políticas de acesso
ALTER TABLE public.fonts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fonts' AND policyname = 'fonts_owner_or_master'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "fonts_owner_or_master" ON public.fonts
        USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master'
          )
        )
        WITH CHECK (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master'
          )
        );
    $sql$;
  END IF;
END$$;

-- 5) Habilitar RLS na tabela audit_logs e permitir INSERT por usuários autenticados (apenas inserir)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_insert_authenticated'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
        FOR INSERT
        WITH CHECK (
          auth.role() = 'authenticated' OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master'
          )
        );
    $sql$;
  END IF;
END$$;

-- Observação: a service_role_key ignora RLS e pode ser usada por operações server-side.
