-- Hardening multi-tenant para brands/categories
-- Objetivo: garantir isolamento por distribuidora (company_id) sem quebrar fluxo individual (user_id)

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_manage_catalog BOOLEAN DEFAULT false;

-- 1) Garantir colunas de escopo
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2) Índices de performance
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON public.brands(company_id);
CREATE INDEX IF NOT EXISTS idx_brands_profile_id ON public.brands(profile_id);
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_profile_id ON public.categories(profile_id);

-- 3) Backfill: converte registros legados user_id -> (company_id/profile_id)
UPDATE public.brands b
SET company_id = p.company_id
FROM public.profiles p
WHERE b.user_id = p.id
  AND b.company_id IS NULL
  AND p.company_id IS NOT NULL;

UPDATE public.brands b
SET profile_id = b.user_id
WHERE b.profile_id IS NULL
  AND b.company_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = b.user_id
  );

UPDATE public.categories c
SET company_id = p.company_id
FROM public.profiles p
WHERE c.user_id = p.id
  AND c.company_id IS NULL
  AND p.company_id IS NOT NULL;

UPDATE public.categories c
SET profile_id = c.user_id
WHERE c.profile_id IS NULL
  AND c.company_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = c.user_id
  );

-- 4) Unicidade por escopo
-- Company scope: nomes podem repetir entre empresas, mas nao dentro da mesma empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_company_name
  ON public.brands(company_id, lower(name))
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_company_name
  ON public.categories(company_id, lower(name))
  WHERE company_id IS NOT NULL;

-- Individual scope legado: preservar unicidade por user_id quando nao estiver em company.
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_user_name_individual
  ON public.brands(user_id, lower(name))
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name_individual
  ON public.categories(user_id, lower(name))
  WHERE company_id IS NULL;

-- 5) RLS: manter leitura publica (catalogo), mas endurecer escrita por escopo
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- BRANDS
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

CREATE POLICY "Users can insert scoped brands" ON public.brands
FOR INSERT
WITH CHECK (
  (
    company_id IS NULL
    AND auth.uid() = user_id
  )
  OR
  (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = brands.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

CREATE POLICY "Users can update scoped brands" ON public.brands
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = brands.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = brands.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

CREATE POLICY "Users can delete scoped brands" ON public.brands
FOR DELETE
USING (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = brands.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

-- CATEGORIES
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

CREATE POLICY "Users can insert scoped categories" ON public.categories
FOR INSERT
WITH CHECK (
  (
    company_id IS NULL
    AND auth.uid() = user_id
  )
  OR
  (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = categories.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

CREATE POLICY "Users can update scoped categories" ON public.categories
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = categories.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = categories.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

CREATE POLICY "Users can delete scoped categories" ON public.categories
FOR DELETE
USING (
  auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = categories.company_id
        AND (
          p.role::text IN ('admin_company', 'master')
          OR COALESCE(p.can_manage_catalog, false)
        )
    )
  )
);

COMMIT;
