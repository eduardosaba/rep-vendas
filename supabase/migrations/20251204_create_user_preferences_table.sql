-- Migration: create user_preferences table used by the dashboard
-- Adds RLS policy so authenticated users can manage their own preferences
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL,
  app_id text NOT NULL,
  table_key text NOT NULL,
  column_order jsonb,
  visible_keys jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, app_id, table_key)
);

-- Enable row level security and add policy for authenticated users
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_prefs_owner_policy' AND polrelid = 'public.user_preferences'::regclass
  ) THEN
    CREATE POLICY user_prefs_owner_policy ON public.user_preferences
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);

COMMIT;
