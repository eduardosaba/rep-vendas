-- Cria a tabela `genders` e policy pública para leitura (execute no Supabase SQL editor)
BEGIN;

-- Geração de UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cria tabela se não existir
CREATE TABLE IF NOT EXISTS public.genders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Habilita RLS e cria policy mínima que permite SELECT público
ALTER TABLE public.genders ENABLE ROW LEVEL SECURITY;

-- Policy: permite leitura para todos (public). Ajuste conforme necessidade de segurança.
-- Use DROP+CREATE to keep compatibility with older Postgres versions
DROP POLICY IF EXISTS "Allow select for public" ON public.genders;
CREATE POLICY "Allow select for public" ON public.genders
  FOR SELECT TO public USING (true);

COMMIT;

-- Exemplo de teste (opcional):
-- INSERT INTO public.genders (user_id, name, image_url) VALUES (NULL, 'Masculino', 'https://example.com/m.png');
-- INSERT INTO public.genders (user_id, name, image_url) VALUES (NULL, 'Feminino', 'https://example.com/f.png');
