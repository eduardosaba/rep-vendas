-- =====================================================
-- 🚨 CORREÇÃO URGENTE: REMOVER ACESSO PÚBLICO A PROFILES
-- =====================================================
-- RISCO DETECTADO: profiles está acessível publicamente
-- Política "Public profiles access" com condição "true"
-- Expõe dados de TODOS os usuários do sistema
-- =====================================================

-- 1. REMOVER POLÍTICA PÚBLICA PERIGOSA
DROP POLICY IF EXISTS "Public profiles access" ON profiles;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. LIMPAR POLÍTICAS DUPLICADAS
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 4. RECRIAR POLÍTICAS SEGURAS E LIMPAS

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

-- Usuário pode inserir seu próprio perfil (onboarding)
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

-- Usuário pode deletar seu próprio perfil (opcional)
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id OR is_master());

-- =====================================================
-- VERIFICAÇÃO IMEDIATA
-- =====================================================

-- Testar: Tentar ler profiles sem autenticação (DEVE RETORNAR 0 ROWS)
SELECT id, email, full_name, role 
FROM profiles 
LIMIT 5;

-- Se retornou 0 rows: ✅ CORRIGIDO
-- Se retorna dados: ❌ AINDA VULNERÁVEL - Execute novamente

-- Listar políticas atualizadas
SELECT 
  policyname,
  cmd,
  qual AS "condição"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================

/*
ANTES (VULNERÁVEL):
| Public profiles access | SELECT | true | ❌ EXPÕE TODOS OS USUÁRIOS

DEPOIS (SEGURO):
| Master can manage profiles   | ALL    | is_master() |
| Users can read own profile   | SELECT | auth.uid() = id OR is_master() |
| Users can insert own profile | INSERT | auth.uid() = id |
| Users can update own profile | UPDATE | auth.uid() = id OR is_master() |
| Users can delete own profile | DELETE | auth.uid() = id OR is_master() |

POLÍTICAS REMOVIDAS:
- Public profiles access (PERIGOSA)
- Users can select own profile (DUPLICADA)
- Users can view own profile (DUPLICADA)
*/
