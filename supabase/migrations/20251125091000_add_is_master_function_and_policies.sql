-- Migration: Adiciona função is_master() e atualiza policies para usar SECURITY DEFINER
-- Observação: a função é criada como SECURITY DEFINER; idealmente o owner da função
-- deve ser um role com permissões apropriadas (ex.: o owner do DB). Revise após aplicar.

-- 1) Cria função que verifica se o usuário atual tem role = 'master'
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()::uuid AND p.role = 'master'
  );
$$;

-- 2) Replace policies to allow owner OR master via is_master()
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR is_master()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR is_master()
  ) WITH CHECK (
    auth.uid() = id OR is_master()
  );

-- Nota de segurança: a função `is_master()` executa com privilégios do owner da função.
-- Revise o owner e remova privilégios indesejados, se necessário.
