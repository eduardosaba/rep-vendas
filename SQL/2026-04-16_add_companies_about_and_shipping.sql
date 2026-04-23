-- Adiciona colunas opcionais em companies usadas pelo frontend
-- Executar com privilégios apropriados (psql/supabase CLI)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'about_text'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN about_text text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'shipping_policy'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN shipping_policy text';
  END IF;
END
$$ LANGUAGE plpgsql;

-- Nota: essa migration é segura para re-execução (verifica existência antes).