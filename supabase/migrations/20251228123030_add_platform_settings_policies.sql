-- Migration: adicionar policies RLS para platform_settings
-- Data: 2025-12-28

-- Habilita RLS na tabela (idempotente)
ALTER TABLE IF EXISTS public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 1) SELECT policy (permitir SELECT para usuários autenticados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'Select platform_settings authenticated'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Select platform_settings authenticated" ON public.platform_settings
        FOR SELECT
        USING (auth.role() = 'authenticated');
    $sql$;
  END IF;
END
$$;

-- 2) INSERT policy (apenas WITH CHECK é permitido para INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'Admins can insert platform_settings'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can insert platform_settings" ON public.platform_settings
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('admin','master')
          )
        );
    $sql$;
  END IF;
END
$$;

-- 3) UPDATE policy (USING + WITH CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'Admins can update platform_settings'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can update platform_settings" ON public.platform_settings
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('admin','master')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('admin','master')
          )
        );
    $sql$;
  END IF;
END
$$;
