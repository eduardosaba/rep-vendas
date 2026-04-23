-- Scope migration for B2B multi-tenant support on brands/categories
-- Adds company/profile ownership and indexes for fast filtering.

BEGIN;

-- BRANDS
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_brands_company_id ON public.brands(company_id);
CREATE INDEX IF NOT EXISTS idx_brands_profile_id ON public.brands(profile_id);

-- CATEGORIES
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_profile_id ON public.categories(profile_id);

-- Backfill ownership based on existing user_id when available.
-- If user belongs to a company, set company_id; otherwise keep profile_id.
UPDATE public.brands b
SET company_id = p.company_id
FROM public.profiles p
WHERE b.user_id = p.id
  AND b.company_id IS NULL
  AND p.company_id IS NOT NULL;

UPDATE public.brands b
SET profile_id = b.user_id
WHERE b.profile_id IS NULL
  AND b.company_id IS NULL;

UPDATE public.categories c
SET company_id = p.company_id
FROM public.profiles p
WHERE c.user_id = p.id
  AND c.company_id IS NULL
  AND p.company_id IS NOT NULL;

UPDATE public.categories c
SET profile_id = c.user_id
WHERE c.profile_id IS NULL
  AND c.company_id IS NULL;

COMMIT;
