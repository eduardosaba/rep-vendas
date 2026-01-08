-- Migração idempotente: habilita RLS em `profiles` e cria políticas seguras
-- 1) Habilita Row Level Security se não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = 'profiles' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END;
$$;

-- 2) Remove policies de INSERT permissivas (qual IS NULL ou qual = 'true') se existirem
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'INSERT' AND (qual IS NULL OR trim(qual) = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- 3) Cria policies seguras (idempotente)
DO $$
BEGIN
  -- SELECT: usuários veem apenas o próprio perfil ou master
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = 'Users can select own profile'
  ) THEN
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
    EXECUTE 'CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id) OR is_master())';
  END IF;

  -- UPDATE: usuários atualizam apenas seu perfil (com WITH CHECK)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = 'Users can update own profile'
  ) THEN
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id) OR is_master()) WITH CHECK ((auth.uid() = id) OR is_master())';
  ELSE
    -- Se policy existir, garantir que exista WITH CHECK (em caso de política criada sem)
    PERFORM 1 FROM pg_policies p WHERE p.policyname = 'Users can update own profile' AND p.tablename = 'profiles';
  END IF;

  -- INSERT: permite criar profile apenas quando auth.uid() = id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = 'Users can insert own profile'
  ) THEN
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END;
$$;

-- Nota: esta migração é idempotente — pode ser executada múltiplas vezes sem erro.
