BEGIN;

CREATE TABLE IF NOT EXISTS public.order_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracking_code TEXT,
  status_note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_history_order
  ON public.order_tracking_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_tracking_history_company
  ON public.order_tracking_history(company_id, created_at DESC);

ALTER TABLE public.order_tracking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_tracking_history_select_by_company ON public.order_tracking_history;
CREATE POLICY order_tracking_history_select_by_company
  ON public.order_tracking_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = order_tracking_history.company_id
    )
  );

DROP POLICY IF EXISTS order_tracking_history_manage_by_admin ON public.order_tracking_history;
CREATE POLICY order_tracking_history_manage_by_admin
  ON public.order_tracking_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = order_tracking_history.company_id
        AND p.role::text IN ('admin_company', 'master', 'logistica_company', 'financeiro_company')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = order_tracking_history.company_id
        AND p.role::text IN ('admin_company', 'master', 'logistica_company', 'financeiro_company')
    )
  );

COMMIT;
