-- Cria tabela para persistir visualizações de updates por usuário
CREATE TABLE IF NOT EXISTS public.user_update_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  seen_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, version)
);

-- Índice por versão para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_user_update_views_version ON public.user_update_views(version);
