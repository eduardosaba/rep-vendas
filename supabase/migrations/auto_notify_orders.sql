-- Auto trigger: notifica vendedor via Edge Function quando um novo pedido é criado
-- Ajustado para usar a tabela `orders` e a Edge Function `send-order-notification`
-- Substitua a URL abaixo se necessário

DO $$
BEGIN
  -- apenas para informar se helper não existir
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'http_request') THEN
    RAISE NOTICE 'supabase_functions.http_request helper not found; the trigger will try to call the Edge Function via helper if available. If not, use Webhooks (Dashboard) or pg_net.';
  END IF;
END$$;

-- Função que chama a Edge Function via helper supabase_functions.http_request (quando disponível)
CREATE OR REPLACE FUNCTION public.fn_notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
  url text := 'https://aawghxjbipcqefmikwby.supabase.co/functions/v1/send-order-notification';
  headers text := json_build_object('Content-Type','application/json')::text;
  payload text;
BEGIN
  payload := json_build_object('new', row_to_json(NEW))::text;
  PERFORM supabase_functions.http_request(url, 'POST', headers, payload, '10000');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela orders
DROP TRIGGER IF EXISTS tr_on_new_order ON public.orders;
CREATE TRIGGER tr_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_new_order();

-- NOTAS:
-- 1) Se a sua instância NÃO tiver o helper supabase_functions.http_request, você pode:
--    - Usar o painel: Database > Webhooks > criar webhook que chama a Edge Function (recomendado).
--    - Ou habilitar a extensão pg_net e adaptar a função para usar net.http_post (exige permissão do provedor).
-- 2) Teste a função invocando manualmente a Edge Function via CLI ou criando um pedido de teste.
-- 3) Logs: veja Edge Functions > send-order-notification > Logs para depuração.
