-- Adiciona colunas usadas pela UI/API em companies (não destrutivo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'contact_email'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN contact_email text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'primary_color'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN primary_color text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'secondary_color'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN secondary_color text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'logo_url'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN logo_url text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'hide_prices_globally'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN hide_prices_globally boolean DEFAULT false NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'require_customer_approval'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN require_customer_approval boolean DEFAULT true NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'block_new_orders'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ADD COLUMN block_new_orders boolean DEFAULT false NOT NULL';
  END IF;
END
$$ LANGUAGE plpgsql;

-- Nota: seguro para re-execução; aplique com um usuário com privilégios (service_role/superuser).