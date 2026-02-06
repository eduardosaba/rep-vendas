-- Script: drop_redundant_public_catalogs_indexes.sql
-- Purpose: Remove redundant indexes on public.public_catalogs.
-- IMPORTANT:
--  - `DROP INDEX CONCURRENTLY` cannot run inside a transaction block.
--  - Run during low traffic to avoid impact on production.
--  - Keep the unique index on `slug` (public_catalogs_slug_key) and the partial
--    index on `is_active = true` (idx_public_catalogs_active) — we drop the
--    non-unique/duplicated ones.

-- Recommended execution (Supabase SQL editor or psql -- single statements):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_public_catalogs_slug;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_public_catalogs_is_active;
-- ANALYZE public.public_catalogs;

-- NOTE: If your SQL runner does not allow CONCURRENTLY, run without it during
-- a maintenance window:
-- DROP INDEX IF EXISTS idx_public_catalogs_slug;
-- DROP INDEX IF EXISTS idx_public_catalogs_is_active;
-- ANALYZE public.public_catalogs;

-- Actual commands below. Uncomment the preferred variant before running.

-- Variant A: Safe, non-transactional (preferred for production)
-- Run the two DROP INDEX CONCURRENTLY commands as separate statements.

-- DROP INDEX CONCURRENTLY IF EXISTS idx_public_catalogs_slug;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_public_catalogs_is_active;
-- ANALYZE public.public_catalogs;

-- Variant B: If CONCURRENTLY is not supported in your environment, run during
-- maintenance (these will acquire locks):
-- DROP INDEX IF EXISTS idx_public_catalogs_slug;
-- DROP INDEX IF EXISTS idx_public_catalogs_is_active;
-- ANALYZE public.public_catalogs;
