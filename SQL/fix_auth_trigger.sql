-- CORREÇÃO: Recriar a função handle_new_user corretamente
-- Execute este SQL no Supabase SQL Editor para corrigir o problema

-- 1. Remover o trigger antigo (se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remover a função antiga (se existir)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Criar a função corrigida
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na tabela profiles usando COALESCE para valores seguros
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'rep'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro (aparecerá nos logs do Supabase)
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    -- Não impede a criação do usuário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.1. Garantir que a função pode bypassar RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3.2. Corrigir a política de INSERT para permitir triggers do sistema
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (
    -- Permite se é o próprio usuário OU se não há usuário (trigger do sistema)
    auth.uid() = id OR auth.uid() IS NULL
  );

-- 4. Criar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar se funcionou
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
