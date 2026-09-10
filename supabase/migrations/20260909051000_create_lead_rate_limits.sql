-- Migration: 20260909051000_create_lead_rate_limits.sql
-- Description: Shared persistent rate limiting table and atomic RPC for public lead captures.
--              Designed for Vercel/serverless: all state in PostgreSQL, zero in-memory dependency.
--              Called exclusively via service_role (SECURITY DEFINER, no public access).

-- 1. Create lead_rate_limits table (stores only hashed IPs, never raw IPs)
CREATE TABLE IF NOT EXISTS public.lead_rate_limits (
  ip_hash text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- 2. Enable RLS with zero policies (no public/anon/authenticated access)
ALTER TABLE public.lead_rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. Explicit privilege revocation (defense-in-depth beyond RLS)
REVOKE ALL ON TABLE public.lead_rate_limits FROM PUBLIC, anon, authenticated;

-- 4. Atomic RPC function for concurrency-safe rate limit checking and increment
--    Uses a single INSERT ... ON CONFLICT DO UPDATE (UPSERT) for full atomicity.
--    PostgreSQL acquires a row-level lock on the conflicting row during ON CONFLICT DO UPDATE,
--    serializing concurrent calls for the same ip_hash.
CREATE OR REPLACE FUNCTION public.check_and_increment_lead_rate_limit(
  p_ip_hash text,
  p_max_attempts int DEFAULT 5,
  p_window_seconds int DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_new_expires timestamptz;
  v_current_count int;
BEGIN
  -- Parameter validation with safe bounds
  IF p_ip_hash IS NULL OR length(trim(p_ip_hash)) = 0 THEN
    RAISE EXCEPTION 'p_ip_hash must not be empty';
  END IF;
  IF p_max_attempts < 1 OR p_max_attempts > 100 THEN
    RAISE EXCEPTION 'p_max_attempts must be between 1 and 100';
  END IF;
  IF p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'p_window_seconds must be between 10 and 86400';
  END IF;

  v_new_expires := v_now + make_interval(secs => p_window_seconds);

  -- Bounded cleanup of expired entries via CTE (PostgreSQL does not support DELETE ... LIMIT)
  WITH expired AS (
    SELECT ip_hash FROM public.lead_rate_limits
    WHERE expires_at < v_now
    LIMIT 100
  )
  DELETE FROM public.lead_rate_limits
  WHERE ip_hash IN (SELECT ip_hash FROM expired);

  -- Atomic UPSERT: single statement, no SELECT-then-INSERT/UPDATE race condition.
  --
  -- Logic:
  --   * New ip_hash       -> INSERT count=1, allowed
  --   * Expired window    -> RESET count=1, allowed
  --   * count < max       -> INCREMENT count+1, allowed
  --   * count >= max      -> INCREMENT count+1 but result > max -> blocked
  --
  -- By always incrementing (even past max), the final count unambiguously tells us
  -- whether this call consumed an allowed slot:
  --   count <= max  -> this attempt was allowed
  --   count >  max  -> this attempt was blocked
  --
  -- This eliminates the bug where keeping count=max and checking count<=max
  -- would incorrectly allow a (max+1)th attempt.
  INSERT INTO public.lead_rate_limits (ip_hash, attempt_count, first_attempt_at, expires_at)
  VALUES (p_ip_hash, 1, v_now, v_new_expires)
  ON CONFLICT (ip_hash) DO UPDATE SET
    attempt_count = CASE
      WHEN public.lead_rate_limits.expires_at < v_now THEN 1
      ELSE public.lead_rate_limits.attempt_count + 1
    END,
    first_attempt_at = CASE
      WHEN public.lead_rate_limits.expires_at < v_now THEN v_now
      ELSE public.lead_rate_limits.first_attempt_at
    END,
    expires_at = CASE
      WHEN public.lead_rate_limits.expires_at < v_now THEN v_new_expires
      ELSE public.lead_rate_limits.expires_at
    END
  RETURNING attempt_count INTO v_current_count;

  RETURN v_current_count <= p_max_attempts;
END;
$$;

-- 5. Revoke execute from all public roles; grant only to service_role
REVOKE ALL ON FUNCTION public.check_and_increment_lead_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_lead_rate_limit(text, int, int) TO service_role;
