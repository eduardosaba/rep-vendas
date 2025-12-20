-- ============================================
-- SCRIPT COMPLETO: Criação de Planos e Assinaturas
-- Execute este script no Supabase Dashboard > SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1) TABELA: plans
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna product_limit se não existir
ALTER TABLE plans ADD COLUMN IF NOT EXISTS product_limit INTEGER NOT NULL DEFAULT 50;

-- Habilitar RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos podem visualizar, apenas service role pode editar
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans" ON plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage plans" ON plans;
CREATE POLICY "Service role can manage plans" ON plans
    FOR ALL USING (true);

-- Índice
CREATE INDEX IF NOT EXISTS plans_price_idx ON plans(price);

-- Inserir planos padrão (só se não existirem)
INSERT INTO plans (name, price, product_limit)
SELECT 'Básico', 29.90, 50
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Básico');

INSERT INTO plans (name, price, product_limit)
SELECT 'Profissional', 49.90, 200
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Profissional');

INSERT INTO plans (name, price, product_limit)
SELECT 'Premium', 99.90, 1000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium');

-- ============================================
-- 2) TABELA: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
    FOR ALL USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Tabelas criadas com sucesso!' AS status;
SELECT * FROM plans ORDER BY price;
