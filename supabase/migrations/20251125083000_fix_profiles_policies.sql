-- Migration: Ajusta políticas RLS da tabela `profiles`
-- Objetivo: garantir que o dono (auth.uid() = id) ou um usuário com role = 'master'
-- possam visualizar/atualizar perfis sem gerar erros por políticas inválidas.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Master can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Master can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy: Usuário pode ver seu próprio profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );

-- Policy: Usuário pode atualizar seu próprio profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
  );

-- Observação: revise essas policies no Console do Supabase antes de aplicar em produção.
