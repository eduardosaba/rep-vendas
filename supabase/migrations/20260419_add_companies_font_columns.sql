-- Adiciona colunas de fonte para personalização de tema por empresa

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS font_family TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS font_url TEXT;
