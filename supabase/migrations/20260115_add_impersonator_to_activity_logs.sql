-- Add impersonator_id to activity_logs for audit tracing
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS impersonator_id UUID REFERENCES public.profiles(id);

-- Index to speed up audit queries by impersonator
CREATE INDEX IF NOT EXISTS idx_activity_logs_impersonator ON public.activity_logs(impersonator_id);

-- Optionally, ensure column is visible to service role (no-op in most setups)
-- GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
