-- Migration: create sync_jobs and sync_job_items and RPC increment_job_progress

-- 1. Table sync_jobs
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'processing', -- processing, completed, failed
  total_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Table sync_job_items
CREATE TABLE IF NOT EXISTS public.sync_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- pending, success, failed
  error_text text,
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON public.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_job_items_job_id ON public.sync_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_products_sync_status_user ON public.products(sync_status, user_id);

-- 4. RPC to increment job progress safely
-- Ensure old signature is removed to allow replacing return type if needed
DROP FUNCTION IF EXISTS public.increment_job_progress(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.increment_job_progress(p_job_id uuid, s_count integer, f_count integer)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  new_total integer;
  updated_row RECORD;
BEGIN
  UPDATE public.sync_jobs
  SET completed_count = COALESCE(completed_count,0) + COALESCE(s_count,0),
      failed_count = COALESCE(failed_count,0) + COALESCE(f_count,0),
      updated_at = NOW()
  WHERE id = p_job_id;

  SELECT * INTO updated_row FROM public.sync_jobs WHERE id = p_job_id;

  IF updated_row.completed_count + updated_row.failed_count >= COALESCE(updated_row.total_count,0) AND updated_row.total_count > 0 THEN
    UPDATE public.sync_jobs SET status = 'completed', updated_at = NOW() WHERE id = p_job_id;
  END IF;

  RETURN jsonb_build_object(
    'id', updated_row.id,
    'status', updated_row.status,
    'total_count', updated_row.total_count,
    'completed_count', updated_row.completed_count,
    'failed_count', updated_row.failed_count
  );
END;
$$;

-- 5. RPC helper: retorna lista de user_id distintos com produtos pendentes
CREATE OR REPLACE FUNCTION public.distinct_user_ids_with_pending()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
AS $$
  SELECT DISTINCT user_id FROM public.products WHERE sync_status = 'pending' AND user_id IS NOT NULL LIMIT 100;
$$;
