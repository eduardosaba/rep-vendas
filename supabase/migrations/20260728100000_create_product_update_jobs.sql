-- Migration: Create Product Update Jobs and Items for Universal Product Update Engine
-- Date: 2026-07-28

CREATE TABLE IF NOT EXISTS public.product_update_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back', 'partially_rolled_back')
  ),
  file_name TEXT NOT NULL,
  file_hash TEXT,
  sheet_name TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  changed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.product_update_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.product_update_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  company_id UUID,
  user_id UUID,
  target_layer TEXT NOT NULL CHECK (target_layer IN ('global', 'company', 'user')),
  target_table TEXT NOT NULL,
  target_record_id UUID NOT NULL,
  target_field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'applied', 'skipped', 'failed', 'rolled_back', 'conflict')
  ),
  error_message TEXT,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

-- Indices for fast querying during execution & rollback
CREATE INDEX IF NOT EXISTS idx_product_update_jobs_status ON public.product_update_jobs(status);
CREATE INDEX IF NOT EXISTS idx_product_update_jobs_created_by ON public.product_update_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_product_update_job_items_job_id ON public.product_update_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_product_update_job_items_target ON public.product_update_job_items(target_table, target_record_id);

-- RLS Policies
ALTER TABLE public.product_update_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_update_job_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_update_jobs' AND policyname = 'Admins can manage jobs') THEN
    CREATE POLICY "Admins can manage jobs" ON public.product_update_jobs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role::text IN ('master', 'admin', 'admin_company', 'company_admin')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_update_job_items' AND policyname = 'Admins can manage job items') THEN
    CREATE POLICY "Admins can manage job items" ON public.product_update_job_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role::text IN ('master', 'admin', 'admin_company', 'company_admin')
        )
      );
  END IF;
END $$;
