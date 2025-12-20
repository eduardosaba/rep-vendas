-- =====================================================
-- MIGRAÇÃO: Criar tabela public_catalogs (SEGURA)
-- =====================================================
-- Objetivo: Isolar dados públicos do catálogo, mantendo
-- settings 100% privada (sem exposição pública)
-- =====================================================

-- 1. CRIAR TABELA public_catalogs
CREATE TABLE IF NOT EXISTS public_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados públicos necessários
  slug TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#3b82f6',
  footer_message TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT slug_length CHECK (length(slug) >= 3 AND length(slug) <= 50)
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_public_catalogs_slug ON public_catalogs(slug);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_user_id ON public_catalogs(user_id);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_active ON public_catalogs(is_active) WHERE is_active = true;

-- 3. TRIGGER DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_public_catalogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_public_catalogs_updated_at
  BEFORE UPDATE ON public_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION update_public_catalogs_updated_at();

-- 4. MIGRAR DADOS EXISTENTES de settings
INSERT INTO public_catalogs (user_id, slug, store_name, logo_url, primary_color, secondary_color, footer_message, is_active)
SELECT 
  user_id,
  catalog_slug,
  name,
  logo_url,
  COALESCE(primary_color, '#2563eb'),
  COALESCE(secondary_color, '#3b82f6'),
  footer_message,
  true
FROM settings
WHERE catalog_slug IS NOT NULL AND catalog_slug != ''
ON CONFLICT (slug) DO NOTHING;

-- 5. RLS POLICIES - LEITURA PÚBLICA APENAS CATÁLOGOS ATIVOS
ALTER TABLE public_catalogs ENABLE ROW LEVEL SECURITY;

-- Leitura pública: APENAS catálogos ativos
DROP POLICY IF EXISTS "Public read active catalogs" ON public_catalogs;
CREATE POLICY "Public read active catalogs"
  ON public_catalogs
  FOR SELECT
  USING (is_active = true);

-- Owner pode ler todos os seus catálogos (ativos ou não)
DROP POLICY IF EXISTS "Users can read own catalogs" ON public_catalogs;
CREATE POLICY "Users can read own catalogs"
  ON public_catalogs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner pode criar seu catálogo (1 por user)
DROP POLICY IF EXISTS "Users can create own catalog" ON public_catalogs;
CREATE POLICY "Users can create own catalog"
  ON public_catalogs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner pode atualizar seu catálogo
DROP POLICY IF EXISTS "Users can update own catalog" ON public_catalogs;
CREATE POLICY "Users can update own catalog"
  ON public_catalogs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner pode deletar seu catálogo
DROP POLICY IF EXISTS "Users can delete own catalog" ON public_catalogs;
CREATE POLICY "Users can delete own catalog"
  ON public_catalogs
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. REMOVER POLÍTICA PÚBLICA DE SETTINGS (se existir)
DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Enable read access for public catalog" ON settings;

-- 7. COMMENTS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public_catalogs IS 'Catálogos públicos com apenas dados seguros para exposição';
COMMENT ON COLUMN public_catalogs.slug IS 'URL única do catálogo (ex: minha-loja)';
COMMENT ON COLUMN public_catalogs.is_active IS 'Controla visibilidade pública do catálogo';
COMMENT ON COLUMN public_catalogs.primary_color IS 'Cor primária da marca (hex)';
COMMENT ON COLUMN public_catalogs.secondary_color IS 'Cor secundária da marca (hex)';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para verificar:
-- SELECT slug, store_name, is_active FROM public_catalogs;
-- 
-- Para testar acesso público (sem autenticação):
-- SELECT * FROM public_catalogs WHERE slug = 'seu-slug';
-- =====================================================
