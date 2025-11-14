-- Atualização do sistema de status de pedidos
-- Adiciona mais status e funcionalidades de acompanhamento

-- Atualizar o CHECK constraint do status para incluir mais opções
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Pendente', 'Confirmado', 'Em Preparação', 'Enviado', 'Entregue', 'Cancelado'));

-- Adicionar campos para acompanhamento do pedido
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar campo de status de notificação
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Atualizar pedidos existentes para status mais descritivo
UPDATE orders SET status = 'Confirmado' WHERE status = 'Pendente' AND created_at < NOW() - INTERVAL '1 hour';
UPDATE orders SET status = 'Em Preparação' WHERE status = 'Pendente' AND created_at < NOW() - INTERVAL '2 hours';