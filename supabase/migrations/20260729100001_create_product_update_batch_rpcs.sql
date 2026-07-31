-- Migration: Transactional RPCs for Product Update Engine + rollback tracking columns
-- Date: 2026-07-29

-- ============================================================
-- 1. ALTER product_update_jobs: add counters + extend status check
-- ============================================================
ALTER TABLE public.product_update_jobs
  ADD COLUMN IF NOT EXISTS unchanged_rows INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conflict_rows INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollback_restored INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollback_conflicts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollback_failed INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  -- Remove old status check constraint so we can extend allowed statuses
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_update_jobs_status_check'
    AND conrelid = 'public.product_update_jobs'::regclass
  ) THEN
    ALTER TABLE public.product_update_jobs DROP CONSTRAINT product_update_jobs_status_check;
  END IF;
END $$;

ALTER TABLE public.product_update_jobs
  ADD CONSTRAINT product_update_jobs_status_check CHECK (
    status IN (
      'pending',
      'processing',
      'completed',
      'partially_completed',
      'failed',
      'rollback_processing',
      'rolled_back',
      'partially_rolled_back'
    )
  );

-- ============================================================
-- 2. ALTER product_update_job_items: add rollback tracking + extend status check
-- ============================================================
ALTER TABLE public.product_update_job_items
  ADD COLUMN IF NOT EXISTS rollback_status TEXT,
  ADD COLUMN IF NOT EXISTS rollback_error TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_update_job_items_status_check'
    AND conrelid = 'public.product_update_job_items'::regclass
  ) THEN
    ALTER TABLE public.product_update_job_items DROP CONSTRAINT product_update_job_items_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_update_job_items_rollback_status_check'
    AND conrelid = 'public.product_update_job_items'::regclass
  ) THEN
    ALTER TABLE public.product_update_job_items DROP CONSTRAINT product_update_job_items_rollback_status_check;
  END IF;
END $$;

ALTER TABLE public.product_update_job_items
  ADD CONSTRAINT product_update_job_items_status_check CHECK (
    status IN ('pending', 'applied', 'skipped', 'unchanged', 'failed', 'rolled_back', 'conflict')
  );

ALTER TABLE public.product_update_job_items
  ADD CONSTRAINT product_update_job_items_rollback_status_check CHECK (
    rollback_status IS NULL OR rollback_status IN ('rolled_back', 'conflict', 'failed', 'not_applicable')
  );

CREATE INDEX IF NOT EXISTS idx_product_update_job_items_rollback
ON public.product_update_job_items (job_id, status, rollback_status);

-- ============================================================
-- 3. RPC 1: apply_product_update_batch
-- Atomically applies a batch (max 200) of pre-created pending
-- product_update_job_items with FOR UPDATE row locks and
-- conflict detection. Writes audit status per item.
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_product_update_batch(
  p_job_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = '30s'
SET lock_timeout = '10s'
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_user_company_id uuid;
  v_user_org_id uuid;
  v_job record;
  v_row jsonb;
  v_job_item_id uuid;
  v_product_id uuid;
  v_target_table text;
  v_target_field text;
  v_target_type text;
  v_scope_type text;
  v_old_value jsonb;
  v_new_value jsonb;
  v_org_id uuid;
  v_company_id uuid;
  v_current_value jsonb;
  v_apply_status text;
  v_total_applied int := 0;
  v_total_unchanged int := 0;
  v_total_conflicts int := 0;
  v_total_failed int := 0;
BEGIN
  -- 1. Auth & authorization
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuario nao autenticado';
  END IF;

  SELECT role, company_id, organization_id
  INTO v_role, v_user_company_id, v_user_org_id
  FROM public.profiles
  WHERE id = v_uid;

  IF v_role IS NULL OR v_role NOT IN ('master', 'admin', 'company_admin', 'admin_company') THEN
    RAISE EXCEPTION 'Acesso negado: permissao insuficiente';
  END IF;

  -- 2. Validate job
  SELECT * INTO v_job
  FROM public.product_update_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job nao encontrado';
  END IF;

  IF v_job.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Job em estado invalido para efetivacao: %', v_job.status;
  END IF;

  IF v_role NOT IN ('master', 'admin') AND v_job.created_by != v_uid THEN
    RAISE EXCEPTION 'Acesso negado: voce nao e o autor deste job';
  END IF;

  v_scope_type := v_job.configuration->'scope'->>'type';

  -- 3. Scope check for company admins
  IF v_role IN ('company_admin', 'admin_company') THEN
    IF v_scope_type = 'COMPANY' THEN
      IF NOT (v_job.configuration->'scope'->'targetCompanyIds' ? v_user_company_id::text) THEN
        RAISE EXCEPTION 'Acesso negado: job pertence a outra empresa';
      END IF;
    ELSIF v_scope_type = 'ORGANIZATION' THEN
      IF NOT (v_job.configuration->'scope'->'targetOrganizationIds' ? v_user_org_id::text) THEN
        RAISE EXCEPTION 'Acesso negado: job pertence a outra organizacao';
      END IF;
    ELSE
      RAISE EXCEPTION 'Acesso negado: administrador de empresa so pode escopo COMPANY ou ORGANIZATION';
    END IF;
  END IF;

  -- 4. Batch validation
  IF coalesce(jsonb_array_length(p_rows), 0) = 0 THEN
    RAISE EXCEPTION 'Lote vazio';
  END IF;

  IF jsonb_array_length(p_rows) > 200 THEN
    RAISE EXCEPTION 'Lote excede limite de 200 itens';
  END IF;

  UPDATE public.product_update_jobs
  SET status = 'processing', started_at = coalesce(started_at, now())
  WHERE id = p_job_id;

  -- 5. Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_job_item_id := (v_row->>'job_item_id')::uuid;
    v_product_id := (v_row->>'product_id')::uuid;
    v_target_table := v_row->>'target_table';
    v_target_field := v_row->>'target_field';
    v_target_type := CASE coalesce(v_row->>'target_type', 'text')
      WHEN 'boolean' THEN 'boolean'
      WHEN 'currency' THEN 'numeric'
      WHEN 'integer' THEN 'integer'
      ELSE 'text'
    END;
    v_old_value := v_row->'old_value';
    v_new_value := v_row->'new_value';
    v_org_id := NULLIF(v_row->>'organization_id', '')::uuid;
    v_company_id := NULLIF(v_row->>'company_id', '')::uuid;

    -- Item must exist, belong to the job, and be pending (idempotent retry-safe)
    IF NOT EXISTS (
      SELECT 1 FROM public.product_update_job_items
      WHERE id = v_job_item_id AND job_id = p_job_id AND status = 'pending'
    ) THEN
      v_total_failed := v_total_failed + 1;
      CONTINUE;
    END IF;

    -- Whitelist target table/field
    IF v_target_table NOT IN ('products') THEN
      v_total_failed := v_total_failed + 1;
      UPDATE public.product_update_job_items
      SET status = 'failed', error_message = 'Tabela nao permitida: ' || v_target_table
      WHERE id = v_job_item_id;
      CONTINUE;
    END IF;

    IF v_target_field NOT IN ('is_active', 'price', 'sale_price', 'cost', 'stock', 'colecao', 'brand', 'tipo_montagem') THEN
      v_total_failed := v_total_failed + 1;
      UPDATE public.product_update_job_items
      SET status = 'failed', error_message = 'Campo nao permitido: ' || v_target_field
      WHERE id = v_job_item_id;
      CONTINUE;
    END IF;

    -- Row-level scope check
    IF v_scope_type = 'COMPANY' THEN
      IF NOT (v_job.configuration->'scope'->'targetCompanyIds' ? coalesce(v_company_id::text, '')) THEN
        v_total_failed := v_total_failed + 1;
        UPDATE public.product_update_job_items
        SET status = 'failed', error_message = 'Produto fora do escopo da empresa'
        WHERE id = v_job_item_id;
        CONTINUE;
      END IF;
    ELSIF v_scope_type = 'ORGANIZATION' THEN
      IF NOT (v_job.configuration->'scope'->'targetOrganizationIds' ? coalesce(v_org_id::text, '')) THEN
        v_total_failed := v_total_failed + 1;
        UPDATE public.product_update_job_items
        SET status = 'failed', error_message = 'Produto fora do escopo da organizacao'
        WHERE id = v_job_item_id;
        CONTINUE;
      END IF;
    END IF;

    -- Lock product row and read current value as jsonb
    BEGIN
      EXECUTE format(
        'SELECT coalesce(to_jsonb(%I), ''null''::jsonb) FROM %I WHERE id = $1 FOR UPDATE',
        v_target_field, v_target_table
      )
      INTO v_current_value
      USING v_product_id;

      IF NOT FOUND THEN
        v_total_failed := v_total_failed + 1;
        UPDATE public.product_update_job_items
        SET status = 'failed', error_message = 'Registro nao encontrado'
        WHERE id = v_job_item_id;
        CONTINUE;
      END IF;
    EXCEPTION WHEN undefined_column THEN
      v_total_failed := v_total_failed + 1;
      UPDATE public.product_update_job_items
      SET status = 'failed', error_message = 'Coluna inexistente: ' || v_target_field
      WHERE id = v_job_item_id;
      CONTINUE;
    END;

    -- Determine apply status (jsonb equality handles booleans, numerics and strings)
    IF v_current_value = v_new_value THEN
      v_apply_status := 'unchanged';
      v_total_unchanged := v_total_unchanged + 1;
    ELSIF v_current_value IS DISTINCT FROM v_old_value THEN
      v_apply_status := 'conflict';
      v_total_conflicts := v_total_conflicts + 1;
    ELSE
      EXECUTE format(
        'UPDATE %I SET %I = $1::%s, updated_at = now() WHERE id = $2',
        v_target_table, v_target_field, v_target_type
      )
      USING v_new_value, v_product_id;

      v_apply_status := 'applied';
      v_total_applied := v_total_applied + 1;
    END IF;

    UPDATE public.product_update_job_items
    SET
      status = v_apply_status,
      applied_at = CASE WHEN v_apply_status = 'applied' THEN now() ELSE NULL END,
      error_message = CASE
        WHEN v_apply_status = 'conflict'
          THEN 'Valor atual diverge do esperado: atual=' || v_current_value::text || ' esperado=' || v_old_value::text
        WHEN v_apply_status = 'unchanged' THEN 'Produto ja estava no valor desejado'
        ELSE NULL
      END
    WHERE id = v_job_item_id;
  END LOOP;

  -- 6. Update job counters atomically
  UPDATE public.product_update_jobs
  SET
    changed_rows = changed_rows + v_total_applied,
    unchanged_rows = unchanged_rows + v_total_unchanged,
    conflict_rows = conflict_rows + v_total_conflicts,
    failed_rows = failed_rows + v_total_failed
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'applied', v_total_applied,
    'unchanged', v_total_unchanged,
    'conflicts', v_total_conflicts,
    'failed', v_total_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_product_update_batch(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_product_update_batch(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_product_update_batch(uuid, jsonb) TO authenticated;

-- ============================================================
-- 4. RPC 2: rollback_product_update_batch
-- Restores previously applied items (max 200) with double row
-- locking (job_item + product) and conflict detection.
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_product_update_batch(
  p_job_id uuid,
  p_item_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = '30s'
SET lock_timeout = '10s'
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_user_company_id uuid;
  v_user_org_id uuid;
  v_job record;
  v_item_id uuid;
  v_job_item record;
  v_scope_type text;
  v_target_type text;
  v_current_value jsonb;
  v_restored int := 0;
  v_conflicts int := 0;
  v_failed int := 0;
  v_already int := 0;
  v_pending int := 0;
BEGIN
  -- 1. Auth & authorization
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuario nao autenticado';
  END IF;

  SELECT role, company_id, organization_id
  INTO v_role, v_user_company_id, v_user_org_id
  FROM public.profiles
  WHERE id = v_uid;

  IF v_role IS NULL OR v_role NOT IN ('master', 'admin', 'company_admin', 'admin_company') THEN
    RAISE EXCEPTION 'Acesso negado: permissao insuficiente';
  END IF;

  -- 2. Validate job
  SELECT * INTO v_job
  FROM public.product_update_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job nao encontrado';
  END IF;

  IF v_job.status NOT IN ('completed', 'partially_completed', 'rolled_back', 'partially_rolled_back') THEN
    RAISE EXCEPTION 'Job em estado invalido para rollback: %', v_job.status;
  END IF;

  IF v_role NOT IN ('master', 'admin') AND v_job.created_by != v_uid THEN
    RAISE EXCEPTION 'Acesso negado: voce nao e o autor deste job';
  END IF;

  v_scope_type := v_job.configuration->'scope'->>'type';

  IF v_role IN ('company_admin', 'admin_company') THEN
    IF v_scope_type = 'COMPANY' THEN
      IF NOT (v_job.configuration->'scope'->'targetCompanyIds' ? v_user_company_id::text) THEN
        RAISE EXCEPTION 'Acesso negado: job pertence a outra empresa';
      END IF;
    ELSIF v_scope_type = 'ORGANIZATION' THEN
      IF NOT (v_job.configuration->'scope'->'targetOrganizationIds' ? v_user_org_id::text) THEN
        RAISE EXCEPTION 'Acesso negado: job pertence a outra organizacao';
      END IF;
    END IF;
  END IF;

  -- 3. Batch validation
  IF coalesce(array_length(p_item_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Lista de itens vazia';
  END IF;

  IF array_length(p_item_ids, 1) > 200 THEN
    RAISE EXCEPTION 'Lote excede limite de 200 itens';
  END IF;

  UPDATE public.product_update_jobs
  SET status = 'rollback_processing'
  WHERE id = p_job_id AND status IN ('completed', 'partially_completed');

  -- 4. Process each item
  FOREACH v_item_id IN ARRAY p_item_ids LOOP
    -- Lock job item first
    SELECT * INTO v_job_item
    FROM public.product_update_job_items
    WHERE id = v_item_id AND job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_failed := v_failed + 1;
      CONTINUE;
    END IF;

    IF v_job_item.status != 'applied' OR v_job_item.rollback_status IS NOT NULL THEN
      v_already := v_already + 1;
      CONTINUE;
    END IF;

    v_target_type := CASE v_job_item.target_field
      WHEN 'is_active' THEN 'boolean'
      WHEN 'price' THEN 'numeric'
      WHEN 'sale_price' THEN 'numeric'
      WHEN 'cost' THEN 'numeric'
      WHEN 'stock' THEN 'integer'
      ELSE 'text'
    END;

    -- Lock target product row and read current value
    BEGIN
      EXECUTE format(
        'SELECT coalesce(to_jsonb(%I), ''null''::jsonb) FROM %I WHERE id = $1 FOR UPDATE',
        v_job_item.target_field, v_job_item.target_table
      )
      INTO v_current_value
      USING v_job_item.target_record_id;

      IF NOT FOUND THEN
        UPDATE public.product_update_job_items
        SET rollback_status = 'failed', rollback_error = 'Registro nao encontrado no rollback'
        WHERE id = v_item_id;
        v_failed := v_failed + 1;
        CONTINUE;
      END IF;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      UPDATE public.product_update_job_items
      SET rollback_status = 'failed', rollback_error = 'Tabela/coluna nao existe no rollback'
      WHERE id = v_item_id;
      v_failed := v_failed + 1;
      CONTINUE;
    END;

    IF v_current_value IS DISTINCT FROM v_job_item.new_value THEN
      -- Someone changed the value after our import: preserve their change
      UPDATE public.product_update_job_items
      SET rollback_status = 'conflict', rollback_error = 'Valor atual diverge do importado'
      WHERE id = v_item_id;
      v_conflicts := v_conflicts + 1;
    ELSE
      EXECUTE format(
        'UPDATE %I SET %I = $1::%s, updated_at = now() WHERE id = $2',
        v_job_item.target_table, v_job_item.target_field, v_target_type
      )
      USING v_job_item.old_value, v_job_item.target_record_id;

      UPDATE public.product_update_job_items
      SET rollback_status = 'rolled_back', rollback_error = NULL, rolled_back_at = now()
      WHERE id = v_item_id;
      v_restored := v_restored + 1;
    END IF;
  END LOOP;

  -- 5. Update job rollback counters
  UPDATE public.product_update_jobs
  SET
    rollback_restored = rollback_restored + v_restored,
    rollback_conflicts = rollback_conflicts + v_conflicts,
    rollback_failed = rollback_failed + v_failed
  WHERE id = p_job_id;

  -- 6. Determine final job status
  SELECT count(*) INTO v_pending
  FROM public.product_update_job_items
  WHERE job_id = p_job_id AND status = 'applied' AND rollback_status IS NULL;

  IF v_pending = 0 THEN
    UPDATE public.product_update_jobs
    SET
      status = CASE
        WHEN v_conflicts > 0 OR v_failed > 0 THEN 'partially_rolled_back'
        ELSE 'rolled_back'
      END,
      rolled_back_at = now()
    WHERE id = p_job_id;
  END IF;

  RETURN jsonb_build_object(
    'restored', v_restored,
    'conflicts', v_conflicts,
    'failed', v_failed,
    'already_processed', v_already
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_product_update_batch(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollback_product_update_batch(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.rollback_product_update_batch(uuid, uuid[]) TO authenticated;
