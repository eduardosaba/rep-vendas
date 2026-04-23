-- Hardening de ownership para products (modelo canonico atual: user_id + company_id)
-- Objetivo:
-- 1) Garantir que todo produto tenha dono
-- 2) Melhorar performance de lookup por owner
-- 3) Preparar unicidade por owner sem quebrar bases legadas com duplicidade

BEGIN;

-- Garantir coluna company_id (idempotente)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Check: ao menos um owner precisa existir (user_id ou company_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_must_have_owner_chk'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_must_have_owner_chk
      CHECK (company_id IS NOT NULL OR user_id IS NOT NULL)
      NOT VALID;
  END IF;
END$$;

-- Validar check apenas se nao houver violacoes
DO $$
DECLARE
  v_violations INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_violations
  FROM public.products
  WHERE company_id IS NULL
    AND user_id IS NULL;

  IF v_violations = 0 THEN
    ALTER TABLE public.products
      VALIDATE CONSTRAINT products_must_have_owner_chk;
  ELSE
    RAISE NOTICE 'products_must_have_owner_chk nao validado. Violacoes encontradas: %', v_violations;
  END IF;
END$$;

-- Indices de escopo (lookup por dono + referencia)
CREATE INDEX IF NOT EXISTS idx_products_company_reference
  ON public.products(company_id, reference_code)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_user_reference
  ON public.products(user_id, reference_code)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_company_sku
  ON public.products(company_id, sku)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_user_sku
  ON public.products(user_id, sku)
  WHERE user_id IS NOT NULL;

COMMIT;

-- Unicidade opcional por owner (executar manualmente quando a base estiver limpa)
-- 1) company_id + reference_code
-- CREATE UNIQUE INDEX uq_products_company_reference_code
--   ON public.products(company_id, reference_code)
--   WHERE company_id IS NOT NULL AND reference_code IS NOT NULL;
--
-- 2) user_id + reference_code
-- CREATE UNIQUE INDEX uq_products_user_reference_code
--   ON public.products(user_id, reference_code)
--   WHERE user_id IS NOT NULL AND reference_code IS NOT NULL;
--
-- 3) company_id + sku
-- CREATE UNIQUE INDEX uq_products_company_sku
--   ON public.products(company_id, sku)
--   WHERE company_id IS NOT NULL AND sku IS NOT NULL;
--
-- 4) user_id + sku
-- CREATE UNIQUE INDEX uq_products_user_sku
--   ON public.products(user_id, sku)
--   WHERE user_id IS NOT NULL AND sku IS NOT NULL;
