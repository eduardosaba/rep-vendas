-- =====================================================
-- SCRIPT DE CORREÇÃO URGENTE - APLICAR NO SUPABASE
-- =====================================================
-- Este script cria TODAS as tabelas que estão faltando
-- causando os erros 500 em produção
-- 
-- COMO APLICAR:
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Menu lateral > SQL Editor
-- 4. Cole TODO este arquivo
-- 5. Clique em RUN (ou Ctrl+Enter)
-- =====================================================

-- ============== 1. TABELA PLANS ==============
BEGIN;

-- Criar tabela plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    product_limit INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans" ON plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage plans" ON plans;
CREATE POLICY "Service role can manage plans" ON plans
    FOR ALL USING (true);

-- Índice
CREATE INDEX IF NOT EXISTS plans_price_idx ON plans(price);

-- Inserir planos padrão
INSERT INTO plans (name, price, product_limit)
SELECT 'Básico', 29.90, 50
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Básico');

INSERT INTO plans (name, price, product_limit)
SELECT 'Profissional', 49.90, 200
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Profissional');

INSERT INTO plans (name, price, product_limit)
SELECT 'Premium', 99.90, 1000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium');

COMMIT;

-- ============== 2. TABELA SUBSCRIPTIONS ==============
BEGIN;

-- Criar tabela subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas (corrigido nome para singular)
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
    FOR ALL USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

COMMIT;

-- ============== 3. COLUNAS ORDERS ==============
BEGIN;

-- Adicionar display_id (número sequencial amigável)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'display_id'
    ) THEN
        -- Criar sequência
        CREATE SEQUENCE IF NOT EXISTS orders_display_id_seq START 1000;
        
        -- Adicionar coluna
        ALTER TABLE orders ADD COLUMN display_id INTEGER DEFAULT nextval('orders_display_id_seq');
        
        -- Criar índice único
        CREATE UNIQUE INDEX IF NOT EXISTS orders_display_id_idx ON orders(display_id);
    END IF;
END $$;

-- Adicionar campos de cliente guest
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name_guest TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone_guest TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;

COMMIT;

-- ============== VERIFICAÇÃO ==============
-- Execute as queries abaixo para confirmar que deu certo:

-- Deve retornar 3 planos:
-- SELECT * FROM plans ORDER BY price;

-- Deve retornar a estrutura da tabela subscriptions:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'subscriptions' ORDER BY ordinal_position;

-- Deve retornar TRUE se display_id existe:
-- SELECT EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'orders' AND column_name = 'display_id'
-- ) as display_id_exists;

-- =====================================================
-- FIM DO SCRIPT - Aguarde a mensagem de sucesso
-- =====================================================
