-- Adiciona a coluna de controle na tabela de perfis
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Opcional: Atualiza usuários recém-criados (se quiser marcar manualmente alguns)
-- UPDATE public.profiles SET onboarding_completed = TRUE WHERE id = '...';
