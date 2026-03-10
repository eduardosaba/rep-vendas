-- 001_create_leads_table.sql
-- Cria tabela 'leads' para captura de contatos vindos da landing page
BEGIN;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  whatsapp text,
  source text,
  metadata jsonb,
  handled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON public.leads (whatsapp);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at);

-- Habilita Row Level Security para permitir políticas customizadas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política: permitir INSERT público (uso pelo anon key do cliente)
-- NOTE: CREATE POLICY não suporta IF NOT EXISTS em todas as versões do Postgres
CREATE POLICY leads_insert_public ON public.leads
  FOR INSERT
  WITH CHECK (true);

-- Política: permitir SELECT apenas para usuários autenticados
CREATE POLICY leads_select_authenticated ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Função / trigger para notificar novos leads via pg_notify
CREATE OR REPLACE FUNCTION public.notify_new_lead() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('new_lead', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

COMMIT;
