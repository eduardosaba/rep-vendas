-- =====================================================
-- MIGRAÇÃO COMPLETA: public_catalogs + SEGURANÇA
-- =====================================================
-- Este script faz TUDO necessário para produção:
-- 1. Cria tabela public_catalogs (segura)
-- 2. Migra dados de settings
-- 3. Remove políticas públicas perigosas
-- 4. Aplica políticas seguras
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAR TABELA public_catalogs
-- =====================================================

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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_public_catalogs_slug ON public_catalogs(slug);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_user_id ON public_catalogs(user_id);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_active ON public_catalogs(is_active) WHERE is_active = true;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_public_catalogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_public_catalogs_updated_at ON public_catalogs;
CREATE TRIGGER trigger_update_public_catalogs_updated_at
  BEFORE UPDATE ON public_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION update_public_catalogs_updated_at();

-- =====================================================
-- PARTE 2: MIGRAR DADOS EXISTENTES
-- =====================================================

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

-- =====================================================
-- PARTE 3: RLS - public_catalogs (LEITURA PÚBLICA SEGURA)
-- =====================================================

ALTER TABLE public_catalogs ENABLE ROW LEVEL SECURITY;

-- Leitura pública APENAS para catálogos ativos
DROP POLICY IF EXISTS "Public read active catalogs" ON public_catalogs;
CREATE POLICY "Public read active catalogs"
  ON public_catalogs
  FOR SELECT
  USING (is_active = true);

-- Owner pode ler todos os seus catálogos
DROP POLICY IF EXISTS "Users can read own catalogs" ON public_catalogs;
CREATE POLICY "Users can read own catalogs"
  ON public_catalogs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner pode criar seu catálogo
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

-- =====================================================
-- PARTE 4: REMOVER POLÍTICAS PÚBLICAS PERIGOSAS
-- =====================================================

-- SETTINGS: Remover TODAS as políticas públicas
DROP POLICY IF EXISTS "Public settings access" ON settings;
DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Enable read access for public catalog" ON settings;
DROP POLICY IF EXISTS "Public read active settings" ON settings;
DROP POLICY IF EXISTS "Allow public read settings" ON settings;

-- PROFILES: Remover política pública
DROP POLICY IF EXISTS "Public profiles access" ON profiles;

-- =====================================================
-- PARTE 5: GARANTIR RLS EM TABELAS SENSÍVEIS
-- =====================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 6: POLÍTICAS SEGURAS - SETTINGS
-- =====================================================

-- Owner pode ler seus próprios settings
DROP POLICY IF EXISTS "Users can read own settings" ON settings;
CREATE POLICY "Users can read own settings"
  ON settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner pode inserir seus próprios settings
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
CREATE POLICY "Users can insert own settings"
  ON settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner pode atualizar seus próprios settings
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
CREATE POLICY "Users can update own settings"
  ON settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner pode deletar seus próprios settings
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
CREATE POLICY "Users can delete own settings"
  ON settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Limpar política duplicada
DROP POLICY IF EXISTS "Users can view own settings" ON settings;

-- =====================================================
-- PARTE 7: POLÍTICAS SEGURAS - PROFILES
-- =====================================================

-- Limpar políticas duplicadas
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Master pode gerenciar todos os perfis
DROP POLICY IF EXISTS "Master can manage profiles" ON profiles;
CREATE POLICY "Master can manage profiles"
  ON profiles
  FOR ALL
  USING (is_master());

-- Usuário pode ler seu próprio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id OR is_master());

-- Usuário pode inserir seu próprio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Usuário pode atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id OR is_master())
  WITH CHECK (auth.uid() = id OR is_master());

-- Usuário pode deletar seu próprio perfil
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id OR is_master());

-- =====================================================
-- PARTE 8: VERIFICAÇÃO FINAL
-- =====================================================

-- Testar com role anônima (todas devem retornar 0 rows)
SET ROLE anon;

-- Teste 1: settings NÃO deve ser acessível
SELECT name, email, price_password FROM settings LIMIT 1;
-- Esperado: 0 rows

-- Teste 2: profiles NÃO deve ser acessível
SELECT id, email, full_name FROM profiles LIMIT 1;
-- Esperado: 0 rows

-- Teste 3: public_catalogs DEVE ser acessível (apenas ativos)
SELECT slug, store_name FROM public_catalogs WHERE is_active = true LIMIT 3;
-- Esperado: Dados retornados (se houver catálogos ativos)

-- Teste 4: products DEVE ser acessível (apenas ativos)
SELECT name, price FROM products WHERE is_active = true LIMIT 3;
-- Esperado: Dados retornados (se houver produtos ativos)

RESET ROLE;

-- =====================================================
-- DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public_catalogs IS 'Catálogos públicos com apenas dados seguros para exposição';
COMMENT ON COLUMN public_catalogs.slug IS 'URL única do catálogo (ex: minha-loja)';
COMMENT ON COLUMN public_catalogs.is_active IS 'Controla visibilidade pública do catálogo';
COMMENT ON COLUMN public_catalogs.primary_color IS 'Cor primária da marca (hex)';
COMMENT ON COLUMN public_catalogs.secondary_color IS 'Cor secundária da marca (hex)';

-- =====================================================
-- SUCESSO!
-- =====================================================
-- Se chegou até aqui sem erros:
-- ✅ Tabela public_catalogs criada
-- ✅ Dados migrados de settings
-- ✅ Políticas públicas perigosas removidas
-- ✅ settings e profiles estão 100% privadas
-- ✅ Catálogo público usa apenas public_catalogs
-- =====================================================
