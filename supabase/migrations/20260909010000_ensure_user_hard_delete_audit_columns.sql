-- Migration: 20260909010000_ensure_user_hard_delete_audit_columns.sql
-- Description: Incremental idempotent migration to ensure table user_hard_delete_audit exists with all required columns.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_hard_delete_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_hard_delete_audit
  ADD COLUMN IF NOT EXISTS target_user_id UUID NULL,
  ADD COLUMN IF NOT EXISTS executor_user_id UUID NULL,
  ADD COLUMN IF NOT EXISTS target_email_snapshot TEXT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'attempted',
  ADD COLUMN IF NOT EXISTS reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS dependency_snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Enable RLS
ALTER TABLE public.user_hard_delete_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service_role or Master users can access hard delete audit records
DROP POLICY IF EXISTS "Hard Delete Audit Service Role and Master Access" ON public.user_hard_delete_audit;
CREATE POLICY "Hard Delete Audit Service Role and Master Access"
ON public.user_hard_delete_audit
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_hard_delete_audit_target ON public.user_hard_delete_audit (target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_hard_delete_audit_status ON public.user_hard_delete_audit (status);

COMMIT;
