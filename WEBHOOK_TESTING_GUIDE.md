# 🧪 WEBHOOK TESTING GUIDE

## 📋 Como Testar o Webhook do Mercado Pago

Siga esta checklist **ordem exata** para garantir que tudo funciona.

---

## 1️⃣ Preparação Local (Ngrok)

### Por quê?

Mercado Pago não consegue enviar webhook para `localhost:3000`. Precisamos de URL pública.

### Setup

```bash
# Terminal 1: Baixar e instalar ngrok (se não tiver)
# https://ngrok.com/download

# Ou via Homebrew (Mac)
brew install ngrok

# Ou via Chocolatey (Windows)
choco install ngrok

# Terminal 1: Iniciar ngrok
ngrok http 3000

# Saída:
# ngrok                                       (Ctrl+C to quit)
# Session Status                      online
# Account
# Version                       3.3.0
# Region                         United States (us)
# Latency                        28ms
# Web Interface              http://127.0.0.1:4040
# Forwarding                    https://YOUR-RANDOM-ID.ngrok-free.app -> http://localhost:3000

# Copie a URL: https://YOUR-RANDOM-ID.ngrok-free.app
```

### Terminal 2: Servidor Next.js

```bash
pnpm dev
# http://localhost:3000 está rodando

# Agora temos URL pública: https://YOUR-RANDOM-ID.ngrok-free.app
```

---

## 2️⃣ Configurar Environment Variables

### Arquivo `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# Mercado Pago
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxx
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxx
MERCADO_PAGO_WEBHOOK_SECRET=webhook_secret_xxxxx

# Webhook URL (IMPORTANTE!)
NEXT_PUBLIC_WEBHOOK_URL=https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago
```

### Reiniciar Servidor

```bash
# Ctrl+C no terminal
pnpm dev
```

---

## 3️⃣ Aplicar Migrations SQL

### No Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá para: SQL Editor
4. Clique em "New Query"
5. Cole conteúdo de: `supabase/migrations/20260620_create_webhook_queue.sql`
6. Clique "Run"

### Ou via Supabase CLI (Recomendado)

```bash
supabase db push
```

### Verificar

```sql
-- SQL Editor
SELECT * FROM webhook_queue LIMIT 1;
-- Resultado: 0 linhas (table vazia, ok!)
```

---

## 4️⃣ Configurar Webhook no Mercado Pago

### No Dashboard do MP

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá para: Configuração > Webhooks
3. Clique: "Agregar Webhook"
4. Preencha:
   ```
   URL: https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago
   Eventos: payment.updated, payment.created
   ```
5. Clique: "Salvar"

### Resultado

MP vai te dar um **Webhook Secret** (copie!)

```bash
# Adicione em .env.local
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

---

## 5️⃣ Teste de Segurança - Validar Assinatura

### Calcular SHA256 Manualmente

```bash
# Dados que MP usa:
# SHA256(xRequestId + accessToken + paymentId)

# Exemplo:
REQUEST_ID="12345abcde"
ACCESS_TOKEN="APP_USR-1234567890"
PAYMENT_ID="999888777"

# Calcular hash (Mac/Linux):
echo -n "${REQUEST_ID}${ACCESS_TOKEN}${PAYMENT_ID}" | sha256sum

# Resultado: abcd1234efgh5678...

# Esse é o valor que deve estar em x-signature do webhook
```

### Teste com Curl

```bash
# Teste 1: Webhook VÁLIDO
curl -X POST "https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: abcd1234efgh5678..." \
  -H "x-request-id: 12345abcde" \
  -H "Content-Type: application/json"

# Resposta esperada:
# { "ok": true, "reason": "enqueued_for_processing" }

# Teste 2: Webhook INVÁLIDO (assinatura errada)
curl -X POST "https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: invalid_signature_fake" \
  -H "x-request-id: 12345abcde" \
  -H "Content-Type: application/json"

# Resposta esperada:
# { "ok": false, "error": "invalid_signature" } (401 Unauthorized)
```

---

## 6️⃣ Teste Completo - Fazer uma Compra Real

### Fluxo Completo

```
1. Abra seu catálogo público
2. Selecione um produto
3. Adicione ao carrinho
4. Vá para checkout
5. Clique "Pagar com Mercado Pago"
6. Sistema redireciona para Mercado Pago (init_point)
7. Use cartão de TESTE do MP:

   Número: 4111 1111 1111 1111
   Vencimento: 11/25
   CVC: 123
   Nome: Teste Webhook

8. Clique "Pagar"
9. MP aprova
10. Retorna para seu site
11. ✅ Webhook foi enviado!
```

---

## 7️⃣ Verificar Webhook na DB

### No Supabase

```sql
-- Ver se webhook foi enfileirado
SELECT * FROM webhook_queue
ORDER BY created_at DESC
LIMIT 1;

-- Resultado esperado:
-- {
--   "id": "uuid-123",
--   "provider": "mercadopago",
--   "provider_payment_id": "999888777",
--   "status": "completed" ou "pending",
--   "attempts": 0,
--   "error_message": null,
--   "created_at": "2026-06-20T10:30:00Z",
--   "updated_at": "2026-06-20T10:30:00Z"
-- }

-- Ver se foi processado
SELECT * FROM webhook_signatures
WHERE provider = 'mercadopago'
ORDER BY created_at DESC
LIMIT 1;

-- Ver transação criada
SELECT * FROM payment_transactions
WHERE provider = 'mercadopago'
ORDER BY created_at DESC
LIMIT 1;

-- Ver pedido atualizado
SELECT id, status, updated_at FROM orders
WHERE id = 'seu_order_id'
LIMIT 1;
```

---

## 8️⃣ Monitorar Logs

### Terminal (Node.js logs)

```bash
# Procure por linhas como:
[MP Webhook] Received notification: { paymentId: '123', type: 'payment', topic: 'payment' }
[MP Webhook] ✅ Enqueued for processing: queue-id-123
[PaymentWebhookProcessor] Processing payment: 123
[PaymentWebhookProcessor] ✅ Payment 123 processed successfully
  Order order-id-456 status: Pagamento Confirmado
```

### Vercel Logs (Produção)

```bash
# No Vercel Dashboard:
# Deployment > Functions > Logs

# Procure por:
# [MP Webhook]
# [PaymentWebhookProcessor]
```

---

## 9️⃣ Teste de Retry (Simular Erro)

### No Supabase

```sql
-- Simular erro durante processamento
UPDATE webhook_queue
SET status = 'pending', attempts = 2
WHERE provider_payment_id = '123';

-- Aguardar 5 segundos (próximo ciclo do Inngest)
-- Webhook será retentado
-- Status mudará para 'processing' → 'completed'
```

---

## 🔟 Teste de Replay Attack

### Terminal

```bash
# Disparar webhook válido
curl -X POST "https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: abcd1234efgh5678..." \
  -H "x-request-id: 12345abcde"

# Resultado: 200 OK { reason: 'enqueued_for_processing' }

# Repetir EXATAMENTE o mesmo comando
curl -X POST "https://YOUR-RANDOM-ID.ngrok-free.app/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: abcd1234efgh5678..." \
  -H "x-request-id: 12345abcde"

# Resultado: 200 OK { reason: 'duplicate_signature' }

# Verificar no Supabase:
SELECT * FROM webhook_signatures
WHERE x_signature = 'abcd1234efgh5678...';
-- Resultado: 1 linha (não duplicou!)
```

---

## 🔍 Troubleshooting

| Problema                     | Causa                          | Solução                               |
| ---------------------------- | ------------------------------ | ------------------------------------- |
| "Missing security headers"   | Curl não enviou x-signature    | Adicionar `-H "x-signature: ..."`     |
| "Invalid x-signature"        | Token incorreto                | Verificar `MERCADO_PAGO_ACCESS_TOKEN` |
| "Transaction not found"      | payment_id não existe no banco | Normal se primeiro webhook            |
| "Queue item not created"     | Erro no Supabase               | Verificar RLS policies                |
| "Ngrok connection refused"   | Ngrok parou                    | Reiniciar `ngrok http 3000`           |
| "Pedido não mudou de status" | Inngest job não rodou          | Aguardar 5 segundos (próximo ciclo)   |

---

## 📊 Checklist de Validação

- [ ] Ngrok rodando em `https://YOUR-RANDOM-ID.ngrok-free.app`
- [ ] Servidor Next.js rodando em `localhost:3000`
- [ ] Env vars configuradas (especialmente `MERCADO_PAGO_ACCESS_TOKEN`)
- [ ] Migration SQL aplicada
- [ ] Webhook configurado no MP Dashboard
- [ ] Teste de curl com assinatura válida → 200 OK
- [ ] Teste de curl com assinatura inválida → 401 Unauthorized
- [ ] Compra com cartão de teste do MP concluída
- [ ] Webhook enfileirado em `webhook_queue`
- [ ] Transação criada em `payment_transactions`
- [ ] Pedido com status "Pagamento Confirmado"
- [ ] Logs mostram `✅ Payment processed successfully`

---

## 🚀 Deploy para Produção

Quando estiver tudo funcionando localmente:

### 1. Push para Git

```bash
git add .
git commit -m "feat: add payment webhook system"
git push origin main
```

### 2. Vercel Deploy (Automático)

```bash
# Vai fazer auto-deploy quando você fizer push

# Monitorar: https://vercel.com/seu-projeto/deployments
```

### 3. Atualizar Webhook no MP

```
Webhook URL: https://seu-dominio-vercel.vercel.app/api/webhooks/payment/mercadopago
(não mais ngrok)
```

### 4. Testar em Produção

```bash
# Repetir testes 1-10 com cartão de teste do MP
```

---

**Status:** ✅ Pronto para Testar

**Próximo Passo:** Siga passo 1️⃣ (ngrok) agora!
