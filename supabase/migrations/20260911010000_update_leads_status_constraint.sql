-- Migration: 20260911010000_update_leads_status_constraint.sql
-- Description: Expansion of check_leads_status constraint to support commercial CRM statuses (in_contact, converted, discarded)

BEGIN;

-- Safely drop existing status constraint on public.leads
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS check_leads_status;

-- Re-add check constraint with expanded status set
ALTER TABLE public.leads
  ADD CONSTRAINT check_leads_status
  CHECK (
    status IS NULL OR status IN (
      'lead_captured',
      'account_created',
      'onboarding_started',
      'activated',
      'in_contact',
      'converted',
      'discarded'
    )
  );

COMMIT;
