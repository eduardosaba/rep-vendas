-- Migration: Update apply_product_update_batch RPC whitelist for Global Multi-Field Update
-- Date: 2026-09-16

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

  IF v_role IS NULL OR v_role NOT IN ('master', 'admin', 'company_admin', 'admin_company', 'representative', 'rep') THEN
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

    -- Item must exist, belong to the job, and be pending
    IF NOT EXISTS (
      SELECT 1 FROM public.product_update_job_items
      WHERE id = v_job_item_id AND job_id = p_job_id AND status = 'pending'
    ) THEN
      v_total_failed := v_total_failed + 1;
      CONTINUE;
    END IF;

    -- Whitelist target table check
    IF v_target_table NOT IN ('products') THEN
      v_total_failed := v_total_failed + 1;
      UPDATE public.product_update_job_items
      SET status = 'failed', error_message = 'Tabela nao permitida: ' || v_target_table
      WHERE id = v_job_item_id;
      CONTINUE;
    END IF;

    -- Expanded Whitelist of allowed product fields
    IF v_target_field NOT IN (
      'sku', 'barcode', 'name', 'reference_code', 'reference_id',
      'is_active', 'is_launch', 'is_best_seller', 'is_destaque', 'price_on_request',
      'price', 'sale_price', 'original_price', 'cost', 'stock_quantity', 'stock',
      'min_stock_level', 'category', 'colecao', 'brand', 'tipo_montagem', 'material',
      'color', 'gender', 'description', 'technical_specs'
    ) THEN
      v_total_failed := v_total_failed + 1;
      UPDATE public.product_update_job_items
      SET status = 'failed', error_message = 'Campo nao permitido na whitelist: ' || v_target_field
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
      SET status = 'failed', error_message = 'Coluna inexistente no banco: ' || v_target_field
      WHERE id = v_job_item_id;
      CONTINUE;
    END;

    -- Determine apply status
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
