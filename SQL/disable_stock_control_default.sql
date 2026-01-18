-- Desativa controle de estoque por padrão e atualiza todos os produtos existentes
BEGIN;

-- Define o default da coluna `track_stock` como FALSE
ALTER TABLE products ALTER COLUMN track_stock SET DEFAULT false;

-- Atualiza todos os produtos existentes para ficar sem controle de estoque
UPDATE products
SET track_stock = false
WHERE track_stock IS DISTINCT FROM false;

COMMIT;
