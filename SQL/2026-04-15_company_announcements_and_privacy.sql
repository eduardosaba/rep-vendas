BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS hide_prices_globally BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_customer_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_new_orders BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_announcements_company
  ON public.company_announcements(company_id);

CREATE INDEX IF NOT EXISTS idx_company_announcements_published
  ON public.company_announcements(company_id, is_published, published_at DESC);

ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_announcements_select_by_company ON public.company_announcements;
CREATE POLICY company_announcements_select_by_company
  ON public.company_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_announcements.company_id
    )
  );

DROP POLICY IF EXISTS company_announcements_manage_by_admin ON public.company_announcements;
CREATE POLICY company_announcements_manage_by_admin
  ON public.company_announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_announcements.company_id
        AND p.role::text IN ('admin_company', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_announcements.company_id
        AND p.role::text IN ('admin_company', 'master')
    )
  );

COMMIT;
