-- Script de Verificação RLS - Execute APÓS os outros scripts
-- Este script verifica se as políticas foram aplicadas corretamente

-- 1. Verificar se RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clients', 'products', 'orders', 'order_items', 'settings')
ORDER BY tablename;

-- 2. Contar políticas por tabela
SELECT
    schemaname,
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('clients', 'products', 'orders', 'order_items', 'settings')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3. Listar todas as políticas detalhadamente
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Verificar buckets de storage
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name IN ('logos', 'banner', 'produtos', 'marcas');

-- 5. Contar políticas de storage
SELECT
    schemaname,
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage'
GROUP BY schemaname, tablename;

-- 6. Políticas de storage detalhadas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- RESULTADO ESPERADO:
-- - 5 tabelas com RLS habilitado
-- - Pelo menos 4-5 políticas por tabela principal
-- - 4 buckets públicos
-- - Políticas de storage para upload e visualização