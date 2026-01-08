-- =============================================
-- MIGRATION: Adicionar suporte a fontes customizadas
-- =============================================
-- Data: 2025-12-28
-- Descrição: Adiciona campos font_url para suportar fontes upload custom

-- 1. ADICIONAR COLUNA font_url NA TABELA settings (Admin Global)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS font_url TEXT;

COMMENT ON COLUMN settings.font_url IS 'URL da fonte customizada global (opcional, fallback para Google Fonts se não definida)';

-- 2. ADICIONAR COLUNA font_url NA TABELA public_catalogs (Per-Store)
ALTER TABLE public_catalogs
ADD COLUMN IF NOT EXISTS font_url TEXT;

COMMENT ON COLUMN public_catalogs.font_url IS 'URL da fonte customizada por loja (opcional, fallback para global ou Google Fonts)';

-- 3. CRIAR TABELA audit_logs (se não existir) para rastreamento
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

COMMENT ON TABLE audit_logs IS 'Registro de auditoria de ações críticas (sync, updates, etc)';

-- 4. HABILITAR RLS NA TABELA audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA audit_logs
-- Master/Admin pode ver todos os logs
CREATE POLICY "Masters can view all audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'master'
  )
);

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view their own audit logs"
ON audit_logs FOR SELECT
USING (user_id = auth.uid());

-- Apenas sistema/backend pode inserir (via service_role)
-- Sem política INSERT para auth.uid() - apenas via server

COMMENT ON POLICY "Masters can view all audit logs" ON audit_logs IS 'Masters visualizam todos os logs de auditoria';
COMMENT ON POLICY "Users can view their own audit logs" ON audit_logs IS 'Usuários visualizam apenas seus próprios logs';

-- =============================================
-- VALIDAÇÃO
-- =============================================
-- Verificar se as colunas foram criadas:
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('settings', 'public_catalogs')
  AND column_name = 'font_url';

-- Verificar se a tabela audit_logs existe:
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'audit_logs';
