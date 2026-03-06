-- Migração: Trava única para popup_logs (Opção B)
-- Criado em 2026-03-06

-- 0. Recomendações antes de rodar:
--  - Fazer backup/export do schema/table: pg_dump ou snapshot do Supabase
--  - Testar em staging antes de aplicar em production

-- 1. Limpeza preventiva: remove duplicatas caso existam antes de aplicar a trava
DELETE FROM public.popup_logs a USING public.popup_logs b
WHERE a.id < b.id 
  AND a.popup_id = b.popup_id 
  AND a.user_id = b.user_id;

-- 2. Remove constraints duplicadas (se existirem) e cria uma única constraint canônica
-- Mantemos o nome `unique_popup_user_id` como padrão.
ALTER TABLE public.popup_logs DROP CONSTRAINT IF EXISTS popup_logs_popup_user_unique;
ALTER TABLE public.popup_logs DROP CONSTRAINT IF EXISTS unique_popup_user;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_popup_user_id'
  ) THEN
    ALTER TABLE public.popup_logs ADD CONSTRAINT unique_popup_user_id UNIQUE (popup_id, user_id);
  END IF;
END
$$;

-- 3. Índice de Performance
-- Acelera a renderização do seu componente PopupViewStats no Admin
CREATE INDEX IF NOT EXISTS idx_popup_logs_stats 
ON public.popup_logs (popup_id, viewed_at);

-- 4. Comentário de auditoria
COMMENT ON TABLE public.popup_logs IS 'Logs de visualização de popups com trava de unicidade por usuário.';
