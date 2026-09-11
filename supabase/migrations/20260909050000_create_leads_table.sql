-- Migration: 20260909050000_create_leads_table.sql
-- Description: Additive migration for public.leads table preserving existing columns (whatsapp, source, metadata, handled, created_at)

-- 1. Ensure table exists with legacy base schema if not created yet
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  whatsapp text,
  source text,
  metadata jsonb,
  handled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Add new columns for funnel capture & tracking (allowing NULL for backward compatibility with pre-existing lead records)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS acting_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead_captured';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Idempotency column for duplicate click & retry protection
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS submission_id uuid;

-- 4. Add CHECK constraints (guarded for NULL values on legacy rows and scoped to public.leads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_leads_acting_type'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads ADD CONSTRAINT check_leads_acting_type
      CHECK (acting_type IS NULL OR acting_type IN ('representante', 'distribuidora', 'industria', 'outro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_leads_status'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads ADD CONSTRAINT check_leads_status
      CHECK (status IS NULL OR status IN ('lead_captured', 'account_created', 'onboarding_started', 'activated'));
  END IF;
END $$;

-- 5. Performance and Idempotency Indexes
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON public.leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_submission_id_unique
ON public.leads(submission_id)
WHERE submission_id IS NOT NULL;

-- 6. Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
