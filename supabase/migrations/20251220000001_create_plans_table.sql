-- Migração: Cria/atualiza tabela de planos de assinatura
-- Define os planos disponíveis no sistema com nome, preço e limite de produtos

BEGIN;

-- 1) Criar tabela plans se não existir
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Adicionar coluna product_limit se não existir
ALTER TABLE plans ADD COLUMN IF NOT EXISTS product_limit INTEGER NOT NULL DEFAULT 50;

-- 3) Habilitar RLS (Row Level Security)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 4) Políticas de acesso (DROP antes de criar para evitar conflitos)
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans" ON plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage plans" ON plans;
CREATE POLICY "Service role can manage plans" ON plans
    FOR ALL USING (true);

-- 5) Índices para melhor performance
CREATE INDEX IF NOT EXISTS plans_price_idx ON plans(price);

-- 6) Inserir planos padrão (só se a tabela estiver vazia)
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
