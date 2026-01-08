-- Habilita Row Level Security e cria policies para public_catalogs
-- Objetivo: permitir leitura pública de catálogos ativos e restringir escrita ao dono (auth.uid())

-- Habilita RLS
ALTER TABLE public.public_catalogs ENABLE ROW LEVEL SECURITY;

-- 1) Leitura pública para catálogos ativos
DROP POLICY IF EXISTS "Public select active catalogs" ON public.public_catalogs;
CREATE POLICY "Public select active catalogs"
ON public.public_catalogs
FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

-- 2) Permite ao dono (user_id) selecionar sempre (mesmo se is_active = false)
-- (já coberto pela cláusula OR acima)

-- 3) Permite INSERT apenas quando o campo user_id for igual ao auth.uid()
DROP POLICY IF EXISTS "Users can insert own public_catalog" ON public.public_catalogs;
CREATE POLICY "Users can insert own public_catalog"
ON public.public_catalogs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4) Permite UPDATE apenas pelo dono
DROP POLICY IF EXISTS "Users can update own public_catalog" ON public.public_catalogs;
CREATE POLICY "Users can update own public_catalog"
ON public.public_catalogs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) Permite DELETE apenas pelo dono
DROP POLICY IF EXISTS "Users can delete own public_catalog" ON public.public_catalogs;
CREATE POLICY "Users can delete own public_catalog"
ON public.public_catalogs
FOR DELETE
USING (auth.uid() = user_id);

-- Observações:
-- - Operações administrativas (via Service Role) ignoram RLS automaticamente.
-- - Se desejar que a plataforma/admin possa modificar catálogos, use o Service Role nas chamadas do backend.
-- - A leitura pública está limitada a linhas com is_active = true para evitar exposição de catálogos desativados.
