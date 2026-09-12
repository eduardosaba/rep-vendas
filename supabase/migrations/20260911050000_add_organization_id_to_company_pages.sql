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

-- Populate organization_id from company_id / organizations where null
UPDATE public.company_pages cp
SET organization_id = cp.company_id
WHERE cp.organization_id IS NULL 
  AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = cp.company_id);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_company_pages_org_slug ON public.company_pages (organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_company_pages_comp_slug ON public.company_pages (company_id, slug);
