-- Migration: create_user_fcm_tokens.sql
-- Cria tabela para armazenar múltiplos tokens FCM por usuário

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  device_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;
-- Evita erro se a policy já existir
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.user_fcm_tokens;

CREATE POLICY "Users can manage their own tokens"
  ON public.user_fcm_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
