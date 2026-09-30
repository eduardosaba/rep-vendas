-- Add organization_id column to company_pages for multi-tenant architecture (distributors & optical stores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'company_pages' 
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.company_pages ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Populate organization_id from company_id / organizations where company_id is an organization id
UPDATE public.company_pages cp
SET organization_id = cp.company_id
WHERE cp.organization_id IS NULL 
  AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = cp.company_id);

-- Populate organization_id from companies table if company has organization_id set
UPDATE public.company_pages cp
SET organization_id = c.organization_id
FROM public.companies c
WHERE cp.company_id = c.id
  AND cp.organization_id IS NULL
  AND c.organization_id IS NOT NULL;

-- Populate organization_id from admin profile if linked
UPDATE public.company_pages cp
SET organization_id = p.organization_id
FROM public.profiles p
WHERE cp.company_id = p.company_id
  AND cp.organization_id IS NULL
  AND p.organization_id IS NOT NULL
  AND p.role IN ('admin_company', 'master');

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_company_pages_org_slug ON public.company_pages (organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_company_pages_comp_slug ON public.company_pages (company_id, slug);

-- Atualizar Policies RLS para garantir isolamento multi-tenant por empresa e organização

-- Leitura por membros da empresa ou organização
DROP POLICY IF EXISTS "Company members can read company pages" ON public.company_pages;
CREATE POLICY "Company members can read company pages"
ON public.company_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.company_id = company_pages.company_id
        OR (company_pages.organization_id IS NOT NULL AND (p.organization_id = company_pages.organization_id OR p.company_id = company_pages.organization_id))
      )
  )
);

-- Inserção restrita a admins da empresa ou organização
DROP POLICY IF EXISTS "Company admins can insert company pages" ON public.company_pages;
CREATE POLICY "Company admins can insert company pages"
ON public.company_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_company', 'master')
      AND (
        p.company_id = company_pages.company_id
        OR (company_pages.organization_id IS NOT NULL AND (p.organization_id = company_pages.organization_id OR p.company_id = company_pages.organization_id))
      )
  )
);

-- Atualização restrita a admins da empresa ou organização
DROP POLICY IF EXISTS "Company admins can update company pages" ON public.company_pages;
CREATE POLICY "Company admins can update company pages"
ON public.company_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_company', 'master')
      AND (
        p.company_id = company_pages.company_id
        OR (company_pages.organization_id IS NOT NULL AND (p.organization_id = company_pages.organization_id OR p.company_id = company_pages.organization_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_company', 'master')
      AND (
        p.company_id = company_pages.company_id
        OR (company_pages.organization_id IS NOT NULL AND (p.organization_id = company_pages.organization_id OR p.company_id = company_pages.organization_id))
      )
  )
);

-- Exclusão restrita a admins da empresa ou organização
DROP POLICY IF EXISTS "Company admins can delete company pages" ON public.company_pages;
CREATE POLICY "Company admins can delete company pages"
ON public.company_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin_company', 'master')
      AND (
        p.company_id = company_pages.company_id
        OR (company_pages.organization_id IS NOT NULL AND (p.organization_id = company_pages.organization_id OR p.company_id = company_pages.organization_id))
      )
  )
);

-- Recarregar o cache do schema no PostgREST
NOTIFY pgrst, 'reload schema';
