-- DIAGNÓSTICO: Verificar triggers de autenticação
-- Execute este SQL no Supabase SQL Editor

-- 1. Listar todos os triggers relacionados a auth
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%user%' OR event_object_table LIKE '%auth%';

-- 2. Verificar a função handle_new_user (se existir)
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname LIKE '%handle%user%' OR proname LIKE '%new%user%';

-- 3. Verificar se a tabela profiles tem as colunas necessárias
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Verificar políticas RLS na tabela profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
