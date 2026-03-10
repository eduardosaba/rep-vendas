# process-new-lead (Supabase Edge Function)

Esta função processa inserts na tabela `leads` e encaminha uma mensagem para sua API de automação (ex: n8n, Make, serviço de WhatsApp).

Variáveis de ambiente esperadas:

- `WHATSAPP_API_URL` - URL do endpoint que receberá o POST com o payload `{ to, name, text }`.
- `WHATSAPP_API_KEY` - (opcional) token Bearer para autenticação no endpoint.

Como testar localmente (Supabase CLI / Deno):

1. Instale o Supabase CLI e faça login.
2. Dentro da pasta do projeto, rode:

```bash
supabase functions serve process-new-lead
```

3. Defina variáveis de ambiente localmente ao rodar, por exemplo (Linux/macOS):

```bash
WHATSAPP_API_URL="https://meu-automation.example/webhook" WHATSAPP_API_KEY="token" supabase functions serve process-new-lead
```

Deploy:

```bash
supabase functions deploy process-new-lead --project-ref YOUR_PROJECT_REF
```

Configurar Database Webhook no painel do Supabase:

1. Acesse Database -> Webhooks.
2. Clique em "Create a new Hook".
3. Preencha:
   - Name: `handle_new_lead`
   - Table: `leads`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Edge Function: `process-new-lead`

Observações de segurança:

- A função não usa o service_role key; mantenha o endpoint de automação protegido.
- Verifique e trate números de telefone antes de enviar mensagens em produção.
