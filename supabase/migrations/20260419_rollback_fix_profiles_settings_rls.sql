-- Rollback para 20260419_fix_profiles_settings_rls.sql
-- Remove policies e funções criadas pela migration de correção de RLS

-- Remove policies criadas
DROP POLICY IF EXISTS "Admins gerem settings dos seus representantes" ON public.settings;
DROP POLICY IF EXISTS "Admins podem inserir membros na própria empresa" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver membros da própria empresa" ON public.profiles;

-- Remove funções helper
DROP FUNCTION IF EXISTS public.admin_manages_member_settings(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_profile_role(uuid);
DROP FUNCTION IF EXISTS public.get_profile_company_id(uuid);

-- Nota: este rollback remove as helpers e policies criadas por
-- 20260419_fix_profiles_settings_rls.sql. Caso havia policies anteriores
-- que foram removidas pela migration original, restaura-las manualmente
-- se necessário (ver histórico do esquema).
