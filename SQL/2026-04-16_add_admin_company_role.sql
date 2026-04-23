-- Migration: adiciona o valor 'admin_company' ao enum user_role
-- Execução segura: só adiciona se não existir

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin_company'
  ) THEN
    EXECUTE 'ALTER TYPE user_role ADD VALUE ''admin_company''';
  END IF;
END
$$ LANGUAGE plpgsql;

-- Nota: execute este arquivo no banco de destino (p.ex. via psql ou supabase CLI).