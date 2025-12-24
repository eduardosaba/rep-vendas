-- Migração para garantir que a tabela settings tenha todas as colunas necessárias
-- Adicionar colunas que podem estar faltando na tabela settings existente

-- Adicionar colunas básicas se não existirem
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar colunas de email se não existirem
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'resend';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_api_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_from TEXT;

-- Adicionar colunas de catálogo se não existirem
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_shipping BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_delivery_address BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments_checkout BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_discount BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_old_price BOOLEAN DEFAULT true;

-- Adicionar colunas de filtros se não existirem
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_price BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_category BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_bestseller BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_new BOOLEAN DEFAULT true;

-- Adicionar campos de timestamp se não existirem
ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Garantir que RLS está habilitado
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can view own settings') THEN
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
        CREATE POLICY "Users can view own settings" ON settings
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can insert own settings') THEN
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
        CREATE POLICY "Users can insert own settings" ON settings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can update own settings') THEN
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
        CREATE POLICY "Users can update own settings" ON settings
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can delete own settings') THEN
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
        CREATE POLICY "Users can delete own settings" ON settings
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Criar trigger para updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar o trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
        CREATE TRIGGER update_settings_updated_at
            BEFORE UPDATE ON settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;