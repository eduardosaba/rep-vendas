-- Migração para garantir que todas as colunas da tabela settings existam
-- Isso resolve problemas de cache do Supabase onde colunas podem não ser reconhecidas

-- Adicionar todas as colunas que devem existir na tabela settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#F3F4F6';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS header_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter, sans-serif';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#111827';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#4B5563';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_provider TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_api_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_shipping BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hide_delivery_address BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hide_installments BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_delivery_address BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments_checkout BOOLEAN DEFAULT true;