-- =====================================================
-- 🚨 CORREÇÃO URGENTE: REMOVER ACESSO PÚBLICO A SETTINGS
-- =====================================================
-- RISCO DETECTADO: settings está acessível publicamente
-- Expõe emails, senhas de preço e dados sensíveis
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS PÚBLICAS DE SETTINGS
DROP POLICY IF EXISTS "Public settings access" ON settings; -- ← ESTA ERA A PERIGOSA!
DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Enable read access for public catalog" ON settings;
DROP POLICY IF EXISTS "Public read active settings" ON settings;
DROP POLICY IF EXISTS "Allow public read settings" ON settings;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS SEGURAS (APENAS OWNER)

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

-- Owner pode deletar seus próprios settings (opcional)
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
CREATE POLICY "Users can delete own settings"
  ON settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICAÇÃO IMEDIATA
-- =====================================================

-- Testar novamente: DEVE RETORNAR 0 ROWS
SELECT name, email, price_password 
FROM settings 
LIMIT 1;

-- Se retornou 0 rows: ✅ CORRIGIDO
-- Se ainda retorna dados: ❌ Execute novamente este script

-- =====================================================
-- OUTRAS TABELAS SENSÍVEIS - VERIFICAR POLÍTICAS
-- =====================================================

-- Verificar se orders está segura
SELECT 
  tablename,
  policyname,
  cmd,
  qual AS "condição"
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Verificar se profiles está segura
SELECT 
  tablename,
  policyname,
  cmd,
  qual AS "condição"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- DOCUMENTAÇÃO DA CORREÇÃO
-- =====================================================

/*
PROBLEMA CORRIGIDO:
- settings estava com política pública permitindo SELECT sem autenticação
- Qualquer pessoa podia ler emails, senhas e configurações

SOLUÇÃO APLICADA:
- Removidas TODAS as políticas públicas de settings
- Criadas políticas que permitem acesso APENAS ao owner (auth.uid() = user_id)

CATÁLOGO PÚBLICO:
- Agora usa tabela public_catalogs para dados públicos
- settings permanece 100% privada

TABELAS PÚBLICAS PERMITIDAS:
✅ public_catalogs (apenas is_active = true)
✅ products (apenas is_active = true)
✅ brands (apenas is_active = true)
✅ saved_carts (apenas por session_id)

TABELAS PRIVADAS (NUNCA PÚBLICAS):
🔒 settings (dados sensíveis)
🔒 orders (pedidos de clientes)
🔒 profiles (dados de usuários)
*/
