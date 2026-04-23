-- Rollback para 20260419_add_companies_font_columns.sql
-- Remove as colunas `font_family` e `font_url` da tabela companies

ALTER TABLE companies
DROP COLUMN IF EXISTS font_family;

ALTER TABLE companies
DROP COLUMN IF EXISTS font_url;
