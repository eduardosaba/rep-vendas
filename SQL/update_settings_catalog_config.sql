-- Script para atualizar a tabela settings com as novas configurações
-- Adicionar colunas show_delivery_address e show_installments_checkout se não existirem

ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_delivery_address BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments_checkout BOOLEAN DEFAULT true;

-- Como as colunas antigas não existem, não precisamos migrar dados
-- As novas colunas já têm os valores padrão corretos (true = mostrar)