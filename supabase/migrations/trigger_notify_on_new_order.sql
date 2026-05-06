-- Trigger: call Edge Function when new order is created
-- Ajuste a URL da sua função em SUPABASE_FUNCTION_URL

-- Nota: algumas instalações Supabase oferecem a função helper `supabase_functions.http_request`.
-- Se não existir, você pode criar um trigger que faz NOTIFY e um job externo escuta, ou chamar a função via webhook do seu app.

DO $$
BEGIN
  -- Exemplo usando supabase_functions.http_request (disponível em alguns projetos Supabase)
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'http_request') THEN
    RAISE NOTICE 'http_request helper not found; please configure trigger to call Edge Function via webhook or use pg_notify + external listener.';
  END IF;
END$$;

-- Trigger function example (use-a se sua instância suportar http_request)
CREATE OR REPLACE FUNCTION public._notify_order_to_edge() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  url text := 'https://aawghxjbipcqefmikwby.supabase.co/functions/v1/send-order-notification';
  headers json := json_build_object('Content-Type','application/json');
  payload text;
BEGIN
  payload := json_build_object('new', row_to_json(NEW))::text;
  PERFORM supabase_functions.http_request(url, 'POST', headers::text, payload, '10000');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_order ON public.orders;
CREATE TRIGGER on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public._notify_order_to_edge();
