-- Segurança: tornar handle_new_user resiliente para não abortar criação de auth.user
-- Substitui a função atual por uma versão que captura erros e usa ON CONFLICT
-- Aplique este arquivo no Supabase SQL Editor (ou via migration runner)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, role, onboarding_completed)
    VALUES (NEW.id, NEW.email, 'user', false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log minimal: não interromper criação do usuário no Auth
    RAISE NOTICE 'handle_new_user suppressed error: %', SQLERRM;
    -- Poderíamos também inserir em tabela de auditoria se necessário
  END;

  RETURN NEW;
END;
$function$;

-- OBS: Esta mudança evita que erros na função impeçam a criação de usuários.
-- Após aplicar, considere investigar a causa raiz (políticas RLS, triggers adicionais
-- ou colunas NOT NULL sem DEFAULT) e corrigir adequadamente.
