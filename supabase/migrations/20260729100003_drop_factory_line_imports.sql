-- Migration: Drop legacy factory line import module (tables + RPCs)
-- Date: 2026-07-29
-- The legacy module was fully superseded by the product update engine.
-- History was migrated to product_update_jobs in 20260729100002.

DROP TABLE IF EXISTS public.factory_line_import_rows CASCADE;
DROP TABLE IF EXISTS public.factory_line_imports CASCADE;

DROP FUNCTION IF EXISTS public.apply_factory_line_import_batch(uuid, jsonb);
DROP FUNCTION IF EXISTS public.apply_factory_line_import_rollback_batch(uuid, uuid[]);
