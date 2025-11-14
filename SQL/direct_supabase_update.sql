-- Script SQL para atualizar o sistema de status de pedidos
-- Execute este script diretamente no SQL Editor do Supabase

-- Primeiro, vamos verificar os status atuais na tabela
SELECT DISTINCT status FROM orders;

-- NORMALIZAR STATUS EXISTENTES ANTES DE APLICAR CONSTRAINT
-- Atualizar qualquer status inválido para 'Pendente' (status padrão)
UPDATE orders SET status = 'Pendente'
WHERE status NOT IN ('Pendente', 'Confirmado', 'Em Preparação', 'Enviado', 'Entregue', 'Cancelado');

-- Adicionar os novos campos se não existirem
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Atualizar o CHECK constraint do status para incluir mais opções
-- Primeiro, remover o constraint existente se houver
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Adicionar o novo constraint com todos os status possíveis
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('Pendente', 'Confirmado', 'Em Preparação', 'Enviado', 'Entregue', 'Cancelado'));

-- Atualizar pedidos existentes para status mais descritivo
-- Apenas atualizar se o status atual for 'Pendente' e o pedido for antigo
UPDATE orders
SET status = 'Confirmado'
WHERE status = 'Pendente'
AND created_at < NOW() - INTERVAL '1 hour';

UPDATE orders
SET status = 'Em Preparação'
WHERE status = 'Pendente'
AND created_at < NOW() - INTERVAL '2 hours';

-- Verificar se as atualizações foram aplicadas
SELECT status, COUNT(*) as quantidade
FROM orders
GROUP BY status
ORDER BY status;