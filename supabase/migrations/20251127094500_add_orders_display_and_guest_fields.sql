-- Migração: adiciona campos esperados pela aplicação em `orders`
-- Cria `display_id` (inteiro incremental), `client_name_guest`, `client_phone_guest` e `item_count`.
-- Backfill para linhas existentes e índice único em `display_id`.

BEGIN;

-- 1) Cria sequência para display_id se não existir
CREATE SEQUENCE IF NOT EXISTS orders_display_id_seq;

-- 2) Adiciona a coluna display_id (se ainda não existir)
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS display_id integer;

-- 3) Preenche display_id para registros existentes
UPDATE orders SET display_id = nextval('orders_display_id_seq')
WHERE display_id IS NULL;

-- 4) Faz a sequência pertencer à coluna e define default para novos inserts
-- Esses comandos podem falhar se a coluna já for uma identity/ja tiver ownership;
-- envolvemos em bloco PL/pgSQL e ignoramos erros para tornar a migração idempotente.
DO $$
BEGIN
  BEGIN
    ALTER SEQUENCE orders_display_id_seq OWNED BY orders.display_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignora se não for possível alterar ownership (ex: sequence já vinculada como identity)
    NULL;
  END;

  BEGIN
    ALTER TABLE orders ALTER COLUMN display_id SET DEFAULT nextval('orders_display_id_seq');
  EXCEPTION WHEN OTHERS THEN
    -- Ignora se não for possível definir default (ex: coluna é identity ou já tem default)
    NULL;
  END;
END$$;

-- 5) Índice/constraint único para facilitar buscas por número curto (pode ser NULL para novos esquemas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'orders' AND indexname = 'orders_display_id_idx'
  ) THEN
    -- CREATE INDEX CONCURRENTLY não pode rodar dentro de transação.
    -- Usamos EXECUTE para criar o índice normalmente (sem CONCURRENTLY) já que
    -- estamos dentro de um bloco transacional. Em produção, para evitar locks,
    -- execute `CREATE INDEX CONCURRENTLY orders_display_id_idx ON orders(display_id);`
    -- manualmente após aplicar a migração.
    EXECUTE 'CREATE UNIQUE INDEX orders_display_id_idx ON orders(display_id)';
  END IF;
END$$;

-- 6) Campos do cliente (usados pelo frontend para guest checkout)
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS client_name_guest text;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS client_phone_guest text;

-- 7) Contagem de itens do pedido
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS item_count integer DEFAULT 0;

DO $$
BEGIN
  -- Só adiciona a constraint nomeada se ela não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    WHERE r.relname = 'orders' AND c.conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Pendente','Confirmado','Em Preparação','Enviado','Entregue','Cancelado','Completo'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignora qualquer erro para manter a migração idempotente; revise manualmente se necessário
  NULL;
END$$;

COMMIT;
