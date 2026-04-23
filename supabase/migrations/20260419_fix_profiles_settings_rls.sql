-- Corrige policies que causavam recursão por consultar public.profiles via auth.uid()
-- Cria funções SECURITY DEFINER para obter company_id/role do usuário autenticado
-- e re-cria as policies usando essas funções para evitar chamadas que disparem RLS

-- Função: retorna company_id de um perfil (executa com privilégios do definidor)
CREATE OR REPLACE FUNCTION public.get_profile_company_id(p_uid uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.profiles WHERE id = p_uid;
$$;

-- Função: retorna role de um perfil
CREATE OR REPLACE FUNCTION public.get_profile_role(p_uid uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = p_uid;
$$;

-- Função: verifica se um admin (admin_id) gerencia as settings do member_id
CREATE OR REPLACE FUNCTION public.admin_manages_member_settings(member_id uuid, admin_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p_member
    JOIN public.profiles p_admin ON p_admin.company_id = p_member.company_id
    WHERE p_member.id = member_id
      AND p_admin.id = admin_id
      AND p_admin.role::text IN ('admin_company', 'owner')
  );
$$;

-- Assegura que RLS está habilitado (idempotente)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas (se existirem) e recria versões seguras
DROP POLICY IF EXISTS "Admins podem ver membros da própria empresa" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem inserir membros na própria empresa" ON public.profiles;
DROP POLICY IF EXISTS "Admins gerem settings dos seus representantes" ON public.settings;

CREATE POLICY "Admins podem ver membros da própria empresa"
ON public.profiles
FOR SELECT
USING (
  company_id = public.get_profile_company_id(auth.uid()::uuid)
);

CREATE POLICY "Admins podem inserir membros na própria empresa"
ON public.profiles
FOR INSERT
WITH CHECK (
  company_id = public.get_profile_company_id(auth.uid()::uuid)
  AND public.get_profile_role(auth.uid()::uuid) IN ('admin_company')
);

CREATE POLICY "Admins gerem settings dos seus representantes"
ON public.settings
FOR ALL
USING (
  public.admin_manages_member_settings(public.settings.user_id, auth.uid()::uuid)
);
