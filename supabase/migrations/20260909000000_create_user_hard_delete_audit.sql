-- Migration: 20260909000000_create_user_hard_delete_audit.sql
-- Description: Creates table for auditing permanent user deletion attempts, failures, and completions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_hard_delete_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NULL,
  executor_user_id UUID NULL,
  target_email_snapshot TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  dependency_snapshot JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ NULL
);

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
