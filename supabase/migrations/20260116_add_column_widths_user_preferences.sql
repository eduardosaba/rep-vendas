-- Migration: Add column_widths to user_preferences
-- Created: 2026-01-16

BEGIN;

-- Add JSONB column to store per-user column widths (nullable)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS column_widths jsonb;

-- Ensure unique index for upsert on (user_id, app_id, table_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_prefs_user_app_table
  ON public.user_preferences (user_id, app_id, table_key);

COMMIT;

-- Down / rollback (safe):
-- BEGIN;
-- DROP INDEX IF EXISTS idx_user_prefs_user_app_table;
-- ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS column_widths;
-- COMMIT;
