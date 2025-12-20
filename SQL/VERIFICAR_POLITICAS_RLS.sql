-- =====================================================
-- VERIFICAÇÃO DE POLÍTICAS RLS - SEGURANÇA
-- =====================================================
-- Objetivo: Auditar políticas de acesso público
-- Garantir que apenas dados seguros estão expostos
-- =====================================================

-- 1. LISTAR TODAS AS POLÍTICAS DE public_catalogs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "USING (filtro)",
  with_check AS "WITH CHECK (validação)"
FROM pg_policies
WHERE tablename = 'public_catalogs'
ORDER BY policyname;

-- 2. LISTAR TODAS AS POLÍTICAS DE products
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "USING (filtro)",
  with_check AS "WITH CHECK (validação)"
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- 3. LISTAR TODAS AS POLÍTICAS DE settings (NÃO DEVE TER PÚBLICA)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "USING (filtro)",
  with_check AS "WITH CHECK (validação)"
FROM pg_policies
WHERE tablename = 'settings'
ORDER BY policyname;

-- 4. LISTAR TODAS AS POLÍTICAS DE brands
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "USING (filtro)",
  with_check AS "WITH CHECK (validação)"
FROM pg_policies
WHERE tablename = 'brands'
ORDER BY policyname;

-- 5. LISTAR TODAS AS POLÍTICAS DE saved_carts
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "USING (filtro)",
  with_check AS "WITH CHECK (validação)"
FROM pg_policies
WHERE tablename = 'saved_carts'
ORDER BY policyname;

-- =====================================================
-- VERIFICAÇÕES CRÍTICAS DE SEGURANÇA
-- =====================================================

-- 6. VERIFICAR TABELAS SEM RLS HABILITADO (PERIGO!)
SELECT 
  schemaname,
  tablename,
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('public_catalogs', 'products', 'settings', 'brands', 'saved_carts', 'orders')
ORDER BY tablename;

-- 7. BUSCAR POLÍTICAS QUE PERMITEM ACESSO PÚBLICO TOTAL (RISCO)
SELECT 
  tablename,
  policyname,
  cmd,
  qual AS "condição"
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%true%' 
    OR qual IS NULL
  )
  AND tablename NOT IN ('public_catalogs') -- public_catalogs PODE ter leitura pública controlada
ORDER BY tablename, policyname;

-- =====================================================
-- TESTES DE ACESSO PÚBLICO (sem autenticação)
-- =====================================================

-- 8. TESTAR: Consegue ler public_catalogs sem auth?
-- Execute em sessão anônima (sem auth.uid())
SELECT slug, store_name, is_active 
FROM public_catalogs 
WHERE is_active = true
LIMIT 3;

-- 9. TESTAR: Consegue ler settings sem auth? (DEVE FALHAR)
-- Execute em sessão anônima (sem auth.uid())
SELECT name, email, price_password 
FROM settings 
LIMIT 1;
-- ⚠️ DEVE FALHAR (0 rows) - se retornar dados, RISCO DE SEGURANÇA

-- 10. TESTAR: Consegue ler products sem auth?
-- Execute em sessão anônima (sem auth.uid())
SELECT name, price, user_id 
FROM products 
WHERE is_active = true
LIMIT 3;

-- =====================================================
-- POLÍTICAS RECOMENDADAS - REFERÊNCIA
-- =====================================================

/*
✅ SEGURO - public_catalogs:
- Leitura pública APENAS para is_active = true
- Owner pode ler/editar/deletar seus próprios

✅ SEGURO - products:
- Leitura pública APENAS para is_active = true
- Owner pode CRUD completo nos seus

✅ SEGURO - brands:
- Leitura pública para brands.is_active = true
- Owner pode CRUD nos seus

✅ SEGURO - saved_carts:
- Inserção pública (anonimous checkout)
- Leitura pública apenas por session_id
- Owner pode ler todos os seus

❌ NUNCA PÚBLICO - settings:
- APENAS owner pode ler/editar
- NENHUMA política pública
- Contém dados sensíveis (senhas, configs)

❌ NUNCA PÚBLICO - orders:
- APENAS owner pode ler seus pedidos
- APENAS owner pode criar pedidos
- Dados sensíveis de clientes
*/

-- =====================================================
-- AÇÕES CORRETIVAS
-- =====================================================

-- Se encontrou política pública em settings:
-- DROP POLICY IF EXISTS "Public read settings" ON settings;
-- DROP POLICY IF EXISTS "Enable read access for public catalog" ON settings;

-- Se alguma tabela está sem RLS:
-- ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUDITORIA COMPLETA
-- =====================================================

-- Executar todas as queries acima e revisar:
-- 1. public_catalogs: Deve ter política pública APENAS para SELECT com is_active = true
-- 2. products: Deve ter política pública APENAS para SELECT com is_active = true
-- 3. settings: NÃO deve ter NENHUMA política pública
-- 4. Todas tabelas críticas devem ter rowsecurity = TRUE
-- 5. Teste anônimo de settings DEVE retornar 0 rows
