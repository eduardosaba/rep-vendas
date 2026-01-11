-- Migration: create RPC to increment sync job progress and record item errors
-- Run this in Supabase SQL editor or via migration tooling.

BEGIN;

-- Table to store per-item results (if not present)
CREATE TABLE IF NOT EXISTS sync_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  product_id uuid,
  status text NOT NULL,
  error_text text,
  created_at timestamptz DEFAULT now()
);

-- Ensure there is an index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sync_job_items_job_id ON sync_job_items(job_id);

-- Ensure sync_jobs has numeric counters expected by the RPC (add if missing)
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS processed integer DEFAULT 0;
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS succeeded integer DEFAULT 0;
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS failed integer DEFAULT 0;
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS completed_count integer DEFAULT 0;
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS total_count integer DEFAULT 0;
-- Ensure timestamp columns exist for compatibility with RPC inserts
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS sync_jobs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Function to increment aggregated counters atomically and record item
CREATE OR REPLACE FUNCTION increment_sync_progress(
  p_job_id uuid,
  p_status text,
  p_product_id uuid DEFAULT NULL,
  p_error_text text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Upsert aggregated counters in sync_jobs
  UPDATE sync_jobs
  SET
    processed = COALESCE(processed, 0) + 1,
    completed_count = COALESCE(completed_count, 0) + 1,
    succeeded = CASE WHEN p_status = 'success' THEN COALESCE(succeeded,0) + 1 ELSE succeeded END,
    failed = CASE WHEN p_status = 'failed' THEN COALESCE(failed,0) + 1 ELSE failed END,
    updated_at = now()
  WHERE id = p_job_id;

  -- If row not found, try insert (to be idempotent in some flows)
  IF NOT FOUND THEN
    INSERT INTO sync_jobs(id, user_id, processed, completed_count, succeeded, failed, created_at, updated_at)
    VALUES (p_job_id, NULL, 1, 1, CASE WHEN p_status = 'success' THEN 1 ELSE 0 END, CASE WHEN p_status = 'failed' THEN 1 ELSE 0 END, now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert per-item record for debugging / UI
  -- Truncar error_text para proteger a coluna contra mensagens muito longas
  INSERT INTO sync_job_items(job_id, product_id, status, error_text)
  VALUES (p_job_id, p_product_id, p_status, substring(p_error_text for 1024));

  RETURN;
END;
$$;

COMMIT;
