-- Migração: cria um backup das policies atuais em `public.policies_backup`
-- Uso: execute este arquivo no SQL editor do Supabase antes de alterar policies.

-- Cria tabela de backup (idempotente)
CREATE TABLE IF NOT EXISTS public.policies_backup (
  policyname text,
  schemaname text,
  tablename text,
  permissive text,
  cmd text,
  qual text,
  with_check text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT policies_backup_pk PRIMARY KEY (policyname, schemaname, tablename)
);

-- Insere / atualiza backup para as tabelas críticas
-- Ajuste a lista abaixo se quiser incluir outras tabelas.
WITH to_backup AS (
  SELECT policyname, schemaname, tablename, permissive::text, cmd::text, qual::text, with_check::text
  FROM pg_policies
  WHERE tablename IN ('profiles','orders','order_items','saved_carts','products','settings')
)
INSERT INTO public.policies_backup (policyname, schemaname, tablename, permissive, cmd, qual, with_check)
SELECT policyname, schemaname, tablename, permissive, cmd, qual, with_check FROM to_backup
ON CONFLICT (policyname, schemaname, tablename) DO UPDATE
  SET permissive = EXCLUDED.permissive,
      cmd = EXCLUDED.cmd,
      qual = EXCLUDED.qual,
      with_check = EXCLUDED.with_check,
      created_at = now();

-- Confirmação: seleciona o backup recém-criado
SELECT * FROM public.policies_backup WHERE tablename IN ('profiles','orders','order_items','saved_carts','products','settings') ORDER BY tablename, policyname;

-- Nota: este arquivo apenas grava uma cópia das policies no schema public. Mantê-lo
-- é seguro e útil para auditoria antes de alterações manuais em RLS.
