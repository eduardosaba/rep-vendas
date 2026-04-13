-- Adiciona modo de desbloqueio de precos (none | modal | fab)
-- Aplicar no SQL Editor do Supabase

ALTER TABLE IF EXISTS public.settings
  ADD COLUMN IF NOT EXISTS price_unlock_mode text;

ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS price_unlock_mode text;

UPDATE public.settings
SET price_unlock_mode = 'none'
WHERE price_unlock_mode IS NULL;

UPDATE public.public_catalogs
SET price_unlock_mode = 'none'
WHERE price_unlock_mode IS NULL;

ALTER TABLE public.settings
  ALTER COLUMN price_unlock_mode SET DEFAULT 'none';

ALTER TABLE public.public_catalogs
  ALTER COLUMN price_unlock_mode SET DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_price_unlock_mode_check'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_price_unlock_mode_check
      CHECK (price_unlock_mode IN ('none', 'modal', 'fab'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_catalogs_price_unlock_mode_check'
  ) THEN
    ALTER TABLE public.public_catalogs
      ADD CONSTRAINT public_catalogs_price_unlock_mode_check
      CHECK (price_unlock_mode IN ('none', 'modal', 'fab'));
  END IF;
END $$;
