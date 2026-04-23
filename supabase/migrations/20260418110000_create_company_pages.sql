-- CMS de paginas customizadas por distribuidora
-- Rota alvo: /catalogo/[slug]/empresa/p/[pageSlug]

CREATE TABLE IF NOT EXISTS public.company_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, slug)
);

ALTER TABLE public.company_pages ENABLE ROW LEVEL SECURITY;

-- Leitura publica de paginas ativas para o catalogo publico
DROP POLICY IF EXISTS "Public can read active company pages" ON public.company_pages;
CREATE POLICY "Public can read active company pages"
ON public.company_pages
FOR SELECT
USING (is_active = true);

-- Membros da propria empresa podem ler todas as paginas da empresa
DROP POLICY IF EXISTS "Company members can read company pages" ON public.company_pages;
CREATE POLICY "Company members can read company pages"
ON public.company_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_pages.company_id
  )
);

-- Apenas admins da propria empresa podem criar
DROP POLICY IF EXISTS "Company admins can insert company pages" ON public.company_pages;
CREATE POLICY "Company admins can insert company pages"
ON public.company_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
        AND p.company_id = company_pages.company_id
          AND p.role IN ('admin_company', 'master')
  )
);

-- Apenas admins da propria empresa podem atualizar
DROP POLICY IF EXISTS "Company admins can update company pages" ON public.company_pages;
CREATE POLICY "Company admins can update company pages"
ON public.company_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
        AND p.company_id = company_pages.company_id
          AND p.role IN ('admin_company', 'master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
        AND p.company_id = company_pages.company_id
          AND p.role IN ('admin_company', 'master')
  )
);

-- Apenas admins da propria empresa podem remover
DROP POLICY IF EXISTS "Company admins can delete company pages" ON public.company_pages;
CREATE POLICY "Company admins can delete company pages"
ON public.company_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_pages.company_id
      AND p.role IN ('admin_company', 'master')
  )
);

-- Trigger simples para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_company_pages()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_company_pages ON public.company_pages;
CREATE TRIGGER trg_set_updated_at_company_pages
BEFORE UPDATE ON public.company_pages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_company_pages();
