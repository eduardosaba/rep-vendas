-- Migration: 20260824_fix_order_status_constraints.sql
-- Description: Drop obsolete check constraints chk_operational_status_enum and chk_commercial_status_enum from orders table

BEGIN;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_operational_status_enum;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_commercial_status_enum;

COMMIT;
