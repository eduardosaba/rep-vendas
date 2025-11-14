-- Script para limpar dados de teste
-- Execute este script APENAS se quiser remover todos os dados de teste

-- ⚠️ ATENÇÃO: Este script remove TODOS os dados das tabelas!
-- Execute apenas em ambiente de desenvolvimento/teste

-- Para limpar apenas dados de teste (mantendo dados reais), use condições WHERE apropriadas

DO $$
DECLARE
    test_user_id UUID := 'USER_ID_AQUI'; -- SUBSTITUA PELO ID DO USUÁRIO DE TESTE
BEGIN

-- Limpar dados na ordem correta (devido às foreign keys)
DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE user_id = test_user_id
);

DELETE FROM orders WHERE user_id = test_user_id;
DELETE FROM clients WHERE user_id = test_user_id;
DELETE FROM products WHERE user_id = test_user_id;

-- Limpar settings se necessário
DELETE FROM settings WHERE user_id = test_user_id;

RAISE NOTICE 'Dados de teste removidos com sucesso!';

END $$;