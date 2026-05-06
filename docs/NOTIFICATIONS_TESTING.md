# Teste de Notificações Push — RepVendas

Este guia mostra como configurar secrets e testar o envio de Push (desenvolvimento).

1) Pré-requisitos
- Ter a tabela `user_fcm_tokens` criada (migration `supabase/migrations/create_user_fcm_tokens.sql`).
- Ter tokens gravados (use o componente `NotificationsCTA` em desktop/mobile).
- Para testes rápidos, usaremos a FCM Server Key (legacy). Para produção, use o HTTP v1 com service account.

2) Variáveis necessárias (local/dev)
No seu `.env.local` adicione as seguintes chaves (ou defina via CLI/secrets no Supabase):

```
NEXT_PUBLIC_SUPABASE_URL=https://aawghxjbipcqefmikwby.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
FCM_SERVER_KEY=<FCM_LEGACY_SERVER_KEY> # apenas para teste rápido
# Para uso com Admin SDK (Server Action):
FIREBASE_CLIENT_EMAIL=<client_email_from_service_account>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
```

Observação: ao colar `private_key` no `.env.local`, substitua quebras de linha por `\\n` ou mantenha a string entre aspas. O código da Server Action já faz `replace('\\n','\n')`.

3) Instalar dependências (local)
```powershell
pnpm add firebase-admin node-fetch dotenv
```

4) Teste rápido (script)
- Preencha `.env.local` com `SUPABASE_SERVICE_ROLE_KEY` e `FCM_SERVER_KEY`.
- Opcional: defina `TEST_VENDOR_ID` no `.env.local` com um `user_id` de teste.
- Execute:
```powershell
node scripts/test-send-notification.mjs '{"id":"test-1","vendedor_id":"<user_uuid>","cliente_nome":"Teste","total":19.9}'
```
- O script buscará tokens em `user_fcm_tokens` e enviará multicast para FCM (legacy). Veja saída no terminal.

5) Teste via Server Action (mais robusto)
- Instale `firebase-admin` e adicione `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` no `.env.local`.
- Chame a Server Action `sendOrderNotification` depois de criar o pedido (ex: `await sendOrderNotification(vendedorId, {...})`).
- Veja logs do servidor (terminal do `pnpm dev`) para debugar falhas do Admin SDK.

6) Deploy / produção
- Use service account e HTTP v1 (OAuth2) preferencialmente.
- Guarde chaves server-only no painel de secrets do provedor (Supabase, Vercel, etc.).

7) Dicas comuns
- Se receber `missing or invalid registration token` ao enviar, remova/limpe tokens inválidos antes de armazenar.
- Não comite chaves reais no repositório.

---
Se quiser, eu gero automaticamente os comandos `supabase` CLI para deploy e set de secrets com os valores que você fornecer.