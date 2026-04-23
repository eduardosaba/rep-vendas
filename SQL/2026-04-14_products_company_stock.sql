-- Migration: Add company ownership and stock control to products
-- Run in Supabase SQL editor or via psql

BEGIN;

-- Add columns
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN DEFAULT true;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products (user_id) WHERE user_id IS NOT NULL;

-- Row level security: allow SELECT if owner or belongs to same company
-- Make sure RLS is enabled (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_select_policy') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY products_select_policy ON public.products
      FOR SELECT USING (
        auth.uid() = user_id
        OR (
          company_id IS NOT NULL AND
          company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
      );
  END IF;
END$$;

COMMIT;
