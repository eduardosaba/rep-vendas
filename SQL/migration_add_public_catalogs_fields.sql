-- Migration: adicionar colunas de estoque, parcelas e desconto ao public_catalogs
-- Roda de forma idempotente (usa IF NOT EXISTS)

BEGIN;

-- 1) Adiciona colunas (idempotente)
ALTER TABLE public.public_catalogs
  ADD COLUMN IF NOT EXISTS enable_stock_management boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_installments boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_installments integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_cash_discount boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_price_discount_percent numeric DEFAULT 0;

-- 2) Normaliza linhas existentes: garantir que flags não fiquem nulas
UPDATE public.public_catalogs
SET
  show_sale_price = COALESCE(show_sale_price, true),
  show_cost_price = COALESCE(show_cost_price, false),
  enable_stock_management = COALESCE(enable_stock_management, false),
  show_installments = COALESCE(show_installments, false),
  max_installments = COALESCE(max_installments, 1),
  show_cash_discount = COALESCE(show_cash_discount, false),
  cash_price_discount_percent = COALESCE(cash_price_discount_percent, 0)
WHERE
  show_sale_price IS NULL OR show_cost_price IS NULL
  OR enable_stock_management IS NULL OR show_installments IS NULL
  OR max_installments IS NULL OR show_cash_discount IS NULL
  OR cash_price_discount_percent IS NULL;

-- 3) Se por acaso houver linhas com ambos true, preferir show_sale_price
UPDATE public.public_catalogs
SET show_cost_price = false
WHERE show_sale_price = true AND show_cost_price = true;

-- 4) Garantir constraint de exclusividade (idempotente, compatível com versões antigas do Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'price_flags_exclusive'
      AND t.relname = 'public_catalogs'
  ) THEN
    EXECUTE 'ALTER TABLE public.public_catalogs ADD CONSTRAINT price_flags_exclusive CHECK (NOT (show_sale_price = true AND show_cost_price = true))';
  END IF;
END;
$$;

COMMIT;
