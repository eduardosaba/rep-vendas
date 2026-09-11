-- Migration: Migrate legacy factory_line_imports history into product_update_jobs
-- Date: 2026-07-29
-- One-time data migration. Maps every legacy import (and its rows) to the new
-- product update engine schema, preserving counters, timestamps, statuses and
-- rollback tracking so the history can be inspected/rolled back from the new UI.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'factory_line_imports') THEN

    WITH migrated AS (
      INSERT INTO public.product_update_jobs (
        status,
        file_name,
        file_hash,
        sheet_name,
        configuration,
        total_rows,
        matched_rows,
        changed_rows,
        failed_rows,
        unchanged_rows,
        conflict_rows,
        rollback_restored,
        rollback_conflicts,
        rollback_failed,
        error_message,
        created_by,
        created_at,
        started_at,
        completed_at,
        rolled_back_at
      )
      SELECT
        CASE fli.status
          WHEN 'PENDING' THEN 'pending'
          WHEN 'PROCESSING' THEN 'processing'
          WHEN 'COMPLETED' THEN 'completed'
          WHEN 'PARTIALLY_COMPLETED' THEN 'partially_completed'
          WHEN 'FAILED' THEN 'failed'
          WHEN 'ROLLBACK_PROCESSING' THEN 'rollback_processing'
          WHEN 'ROLLED_BACK' THEN 'rolled_back'
          WHEN 'PARTIALLY_ROLLED_BACK' THEN 'partially_rolled_back'
          WHEN 'ROLLBACK_FAILED' THEN 'failed'
          ELSE 'pending'
        END,
        fli.file_name,
        fli.file_hash,
        NULL,
        jsonb_build_object(
          'source', 'factory_line_imports',
          'migratedFrom', jsonb_build_object('table', 'factory_line_imports', 'id', fli.id::text),
          'legacyStatus', fli.status,
          'brand', jsonb_build_object('code', fli.brand_code, 'name', fli.brand_name),
          'scope', jsonb_build_object(
            'type', fli.scope,
            'targetOrganizationIds', CASE WHEN fli.scope = 'ORGANIZATION' THEN jsonb_build_array(fli.scope_data->>'organization_id') ELSE '[]'::jsonb END,
            'targetCompanyIds', CASE WHEN fli.scope = 'COMPANY' THEN jsonb_build_array(fli.scope_data->>'company_id') ELSE '[]'::jsonb END
          )
        ),
        fli.total_rows,
        fli.total_matched,
        fli.total_updated,
        fli.total_failed,
        fli.total_unchanged,
        fli.total_conflicts,
        fli.rollback_restored,
        fli.rollback_conflicts,
        fli.rollback_failed,
        fli.error_message,
        fli.created_by,
        fli.created_at,
        fli.processing_started_at,
        fli.completed_at,
        fli.rolled_back_at
      FROM public.factory_line_imports fli
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_update_jobs j
        WHERE j.configuration->>'source' = 'factory_line_imports'
          AND j.configuration->'migratedFrom'->>'id' = fli.id::text
      )
      RETURNING id, configuration
    )

    INSERT INTO public.product_update_job_items (
      job_id,
      row_number,
      product_id,
      company_id,
      user_id,
      target_layer,
      target_table,
      target_record_id,
      target_field,
      old_value,
      new_value,
      action_type,
      status,
      error_message,
      applied_at,
      rolled_back_at,
      rollback_status,
      rollback_error
    )
    SELECT
      m.id,
      row_number() OVER (PARTITION BY flr.import_id ORDER BY flr.created_at, flr.id),
      flr.product_id,
      flr.company_id,
      flr.user_id,
      CASE WHEN flr.company_id IS NOT NULL THEN 'company' ELSE 'global' END,
      'products',
      flr.product_id,
      'is_active',
      to_jsonb(flr.previous_is_active),
      to_jsonb(flr.new_is_active),
      lower(flr.action),
      CASE
        WHEN flr.rollback_status = 'ROLLED_BACK' THEN 'rolled_back'
        WHEN flr.apply_status = 'UPDATED' THEN 'applied'
        WHEN flr.apply_status = 'UNCHANGED' THEN 'unchanged'
        WHEN flr.apply_status = 'CONFLICT' THEN 'conflict'
        WHEN flr.apply_status = 'FAILED' THEN 'failed'
        ELSE 'pending'
      END,
      flr.apply_error,
      flr.applied_at,
      flr.rolled_back_at,
      CASE flr.rollback_status
        WHEN 'ROLLED_BACK' THEN 'rolled_back'
        WHEN 'CONFLICT' THEN 'conflict'
        WHEN 'FAILED' THEN 'failed'
        WHEN 'NOT_APPLICABLE' THEN 'not_applicable'
        ELSE NULL
      END,
      flr.rollback_error
    FROM public.factory_line_import_rows flr
    JOIN migrated m ON m.configuration->'migratedFrom'->>'id' = flr.import_id::text
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_update_job_items i
      WHERE i.job_id = m.id AND i.target_record_id = flr.product_id AND i.target_field = 'is_active'
    );

  END IF;
END $$;
