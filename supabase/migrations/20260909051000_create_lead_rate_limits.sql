-- Migration: 20260909051000_create_lead_rate_limits.sql
-- Description: Shared persistent rate limiting table and atomic RPC for public lead captures

-- 1. Create lead_rate_limits table
CREATE TABLE IF NOT EXISTS public.lead_rate_limits (
  ip_hash text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- 2. Enable RLS with zero public access (server-side service_role execution only)
ALTER TABLE public.lead_rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. Atomic RPC function for concurrency-safe rate limit checking and increment
CREATE OR REPLACE FUNCTION public.check_and_increment_lead_rate_limit(
  p_ip_hash text,
  p_max_attempts int DEFAULT 5,
  p_window_seconds int DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamptz := now();
  v_record public.lead_rate_limits%ROWTYPE;
BEGIN
  -- 1. Cleanup expired rate limit entries
  DELETE FROM public.lead_rate_limits WHERE expires_at < v_now;

  -- 2. Lock row for atomic concurrency protection
  SELECT * INTO v_record FROM public.lead_rate_limits WHERE ip_hash = p_ip_hash FOR UPDATE;

  -- 3. If entry doesn't exist or window expired, upsert new window
  IF NOT FOUND OR v_record.expires_at < v_now THEN
    INSERT INTO public.lead_rate_limits (ip_hash, attempt_count, first_attempt_at, expires_at)
    VALUES (p_ip_hash, 1, v_now, v_now + (p_window_seconds || ' seconds')::interval)
    ON CONFLICT (ip_hash) DO UPDATE
    SET attempt_count = 1,
        first_attempt_at = v_now,
        expires_at = v_now + (p_window_seconds || ' seconds')::interval;
    RETURN true;
  END IF;

  -- 4. Check if max attempts reached
  IF v_record.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  -- 5. Atomically increment attempt count
  UPDATE public.lead_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE ip_hash = p_ip_hash;

  RETURN true;
END;
$$;
