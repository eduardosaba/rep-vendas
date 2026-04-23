-- Migration segura: adiciona 'admin_company' ao enum user_role em ambientes
-- onde ALTER TYPE ... ADD VALUE não pode ser executado fora de transaction.

DO $$
DECLARE
  has boolean;
  labels text;
  rec record;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin_company'
  ) INTO has;

  IF has THEN
    RAISE NOTICE 'admin_company já existe — nada a fazer.';
    RETURN;
  END IF;

  -- coletar labels atuais em ordem
  SELECT string_agg(quote_literal(e.enumlabel), ',') INTO labels
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  WHERE t.typname = 'user_role'
  ORDER BY e.enumsortorder;

  labels := labels || ',' || quote_literal('admin_company');

  EXECUTE format('CREATE TYPE user_role_new AS ENUM (%s)', labels);

  -- alterar todas as colunas que usam o tipo user_role para o novo tipo
  FOR rec IN
    SELECT n.nspname as schema_name, c.relname as table_name, a.attname as column_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.typname = 'user_role' AND a.attnum > 0
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE user_role_new USING %I::text::user_role_new',
                   rec.schema_name, rec.table_name, rec.column_name, rec.column_name);
  END LOOP;

  -- remover tipo antigo e renomear o novo
  EXECUTE 'DROP TYPE user_role';
  EXECUTE 'ALTER TYPE user_role_new RENAME TO user_role';
  RAISE NOTICE 'user_role atualizado com admin_company.';
END
$$ LANGUAGE plpgsql;

-- Nota: se existirem funções ou objetos dependentes diretamente do tipo (assinaturas),
-- pode ser necessário ajustar manualmente. Faça backup antes de aplicar.