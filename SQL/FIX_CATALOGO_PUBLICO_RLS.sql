-- =====================================================
-- CORREÇÃO URGENTE: Permitir Acesso Público ao Catálogo
-- =====================================================
-- Problema: "Loja não encontrada" ao acessar catálogo publicamente
-- Causa: RLS bloqueando leitura anônima de 'settings' e 'products'
-- Solução: Adicionar policies de leitura pública
-- =====================================================

BEGIN;

-- ============== 1. SETTINGS - LEITURA PÚBLICA ==============
-- O catálogo precisa ler as configurações da loja (nome, logo, cores, etc)
-- sem estar autenticado

DROP POLICY IF EXISTS "Public read settings" ON public.settings;
CREATE POLICY "Public read settings" ON public.settings 
  FOR SELECT USING (true);

-- Manter as policies existentes de escrita (somente owner)
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.settings;
CREATE POLICY "Users can insert their own settings" ON public.settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
CREATE POLICY "Users can update their own settings" ON public.settings 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.settings;
CREATE POLICY "Users can delete their own settings" ON public.settings 
  FOR DELETE USING (auth.uid() = user_id);

-- ============== 2. PRODUCTS - CONFIRMAR LEITURA PÚBLICA ==============
-- Produtos já devem ter leitura pública, mas vamos garantir

DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products 
  FOR SELECT USING (true);

-- Manter policies existentes de escrita
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- ============== 3. BRANDS - LEITURA PÚBLICA ==============
-- Marcas também precisam ser públicas para o catálogo

DROP POLICY IF EXISTS "Public read brands" ON public.brands;
CREATE POLICY "Public read brands" ON public.brands 
  FOR SELECT USING (true);

-- ============== 4. SAVED_CARTS - LEITURA PÚBLICA ==============
-- Carrinhos salvos precisam ser recuperáveis via código público

DROP POLICY IF EXISTS "Public read saved_carts" ON public.saved_carts;
CREATE POLICY "Public read saved_carts" ON public.saved_carts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert saved_carts" ON public.saved_carts;
CREATE POLICY "Public insert saved_carts" ON public.saved_carts 
  FOR INSERT WITH CHECK (true);

COMMIT;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute estas queries para confirmar que funcionou:

-- 1. Ver todas as policies de settings:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'settings';

-- 2. Testar se usuário anônimo consegue ler settings:
-- SELECT name, catalog_slug FROM settings LIMIT 1;

-- 3. Ver policies de products:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE tablename = 'products';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
