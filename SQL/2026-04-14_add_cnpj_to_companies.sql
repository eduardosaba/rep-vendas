-- Migration: Add cnpj column to companies
-- Run this in Supabase SQL editor or via psql.

BEGIN;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- optional: ensure column is indexed for lookups
CREATE INDEX IF NOT EXISTS companies_cnpj_idx ON public.companies (cnpj);

COMMIT;
